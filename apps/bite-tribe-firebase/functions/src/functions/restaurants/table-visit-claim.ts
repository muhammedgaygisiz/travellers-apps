import { DocumentData } from 'firebase-admin/firestore';
import {
  TABLE_SESSION_END_STATUSES,
  TableSessionStatus,
  isEndedSession,
  isTableSessionStatus,
} from './table-session';

/**
 * Moving a meal from the anonymous account that ordered it onto the account the
 * guest signed into (GitHub issue #1658).
 *
 * Issue #1657 upgrades an anonymous guest *in place*, which is the ordinary
 * path and works for a guest who registers. It cannot work for a guest who
 * already has an account: Firebase refuses to link a credential that belongs to
 * another user, so after signing in the guest holds their own uid while the
 * session, the orders and the signals they raised are still filed under the
 * anonymous one they arrived with. This is the exception, and it moves the
 * documents rather than the account.
 */

export const TABLE_VISIT_CLAIM_REFUSAL_REASONS = [
  /** No session under the claimed uid at that table. */
  'sessionNotFound',
  /** The session was not the caller's to claim. */
  'notTheClaimedGuest',
  /** The proof was not a live anonymous session's. */
  'notAnAnonymousSession',
  /** The caller is already the account that holds the session. */
  'alreadyYours',
  /** Both sessions are live and sitting in different visits. */
  'visitMismatch',
] as const;

export type TableVisitClaimRefusalReason =
  (typeof TABLE_VISIT_CLAIM_REFUSAL_REASONS)[number];

export interface TableVisitClaimRefused {
  ok: false;
  reason: TableVisitClaimRefusalReason;
}

export interface TableVisitClaimed {
  ok: true;
  /** The session the meal now hangs from, named after the signed-in account. */
  sessionId: string;
  /** The visit it is in, absent while the party is still waiting to be seated. */
  visitId?: string;
  /** How many orders changed hands, for the screen that says what moved. */
  movedOrders: number;
}

export type TableVisitClaimResult = TableVisitClaimed | TableVisitClaimRefused;

export const refuseClaim = (
  reason: TableVisitClaimRefusalReason,
): TableVisitClaimRefused => ({ ok: false, reason });

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const statusOf = (session: DocumentData): TableSessionStatus =>
  isTableSessionStatus(session['status']) ? session['status'] : 'expired';

const visitIdOf = (session: DocumentData): string =>
  typeof session['visitId'] === 'string' ? session['visitId'] : '';

/**
 * The session the signed-in account ends up with.
 *
 * The plain case is the whole of it: there is no session under the account's
 * own name at this table, so the anonymous one is rewritten under that name and
 * nothing is decided. `target` is that session where the account *does* already
 * hold one - the same person scanned the code twice, once signed in and once
 * not - and then every field where the two disagree needs a rule. `RD-TS-42`:
 *
 * - **An ended session is not merged with, it is replaced.** It is a closed
 *   meal that happens to share a name, and `RD-TS-5` says ending is one-way.
 * - **`active` wins over `pending`.** Staff seated this party; which of its two
 *   sessions the confirmation landed on is an accident of ordering.
 * - **The earliest `startedAt` and the latest `lastActiveAt`.** The party
 *   arrived once, at the earlier of the two, and the idle clock measures from
 *   the last thing they did on either.
 * - **The account is not anonymous any more**, whichever session it came from.
 *
 * Two *live* sessions in different visits are not merged at all - the caller is
 * refused - because one of the two order lists would be silently moved to
 * another party's table.
 */
export const mergeTableSessions = (
  source: DocumentData,
  target: DocumentData | undefined,
  sessionId: string,
  guestUserId: string,
): DocumentData => {
  const replacing = !target || isEndedSession(target);

  const status: TableSessionStatus = replacing
    ? statusOf(source)
    : statusOf(source) === 'active' || statusOf(target) === 'active'
      ? 'active'
      : 'pending';

  const startedAt = replacing
    ? numberOr(source['startedAt'], 0)
    : Math.min(
        numberOr(source['startedAt'], 0),
        numberOr(target['startedAt'], 0),
      );

  const lastActiveAt = replacing
    ? numberOr(source['lastActiveAt'], 0)
    : Math.max(
        numberOr(source['lastActiveAt'], 0),
        numberOr(target['lastActiveAt'], 0),
      );

  const visitId = replacing
    ? visitIdOf(source)
    : visitIdOf(source) || visitIdOf(target);

  const merged: DocumentData = {
    ...source,
    id: sessionId,
    guestUserId,
    status,
    startedAt,
    lastActiveAt,
    isAnonymousGuest: false,
  };

  if (visitId) {
    merged['visitId'] = visitId;
  } else {
    delete merged['visitId'];
  }

  // A live session carries no `endedAt`, and the source may have brought one:
  // the guest left the table on this phone, signed in, and is claiming the meal
  // back. Firestore refuses an `undefined` value outright, so the field is
  // removed rather than written as one - the same reason the visit above is.
  if (!TABLE_SESSION_END_STATUSES.includes(status)) {
    delete merged['endedAt'];
  }

  return merged;
};

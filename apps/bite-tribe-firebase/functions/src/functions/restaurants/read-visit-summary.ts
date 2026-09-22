import { getFirestore } from 'firebase-admin/firestore';
import type { DocumentData } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { isAnonymousSession } from '../shared/roles';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
} from './restaurant-authority';
import {
  TABLE_SESSIONS_COLLECTION,
  tableOrderingOf,
  tableSessionId,
  tableSessionIdleTimeoutMs,
} from './table-session';
import {
  USERS_COLLECTION,
  VISIT_SUMMARIES_COLLECTION,
  VisitSummary,
  VisitSummaryRefused,
  refuseSummary,
} from './visit-summary';

/**
 * The meals a guest keeps, and the one rule about how long they keep them
 * (GitHub issue #1111).
 *
 * ## Why a callable rather than a rule
 *
 * The document lives under the caller's own uid, so `isSelf(uid)` would admit
 * it in one line of `firestore.rules` and this file would not exist. What that
 * line cannot express is the retention rule: **a member keeps their summaries
 * for as long as the account exists, and a guest who never registered keeps
 * theirs until the session that produced them goes idle** (`RD-TS-46`).
 *
 * Idle is `lastActiveAt` measured against the restaurant's own
 * `sessionIdleTimeoutMinutes` (`RD-TS-5`), which is a per-restaurant setting on
 * a document in another collection. Rules cannot do that arithmetic, and
 * giving the summary its own expiry field would be a second clock describing
 * the same thing - which is what `RD-TS-5` refused when it made expiry a
 * predicate rather than a swept job.
 *
 * So the rules refuse every client read of the subcollection and this is the
 * way in.
 *
 * ## Why the gate is the provider rather than a `/users` lookup
 *
 * `isAnonymousSession` reads `firebase.sign_in_provider` off the verified
 * token, which is already in hand (`RD-TS-40`). A guest who registers during
 * or after the meal keeps their uid (issue #1657), so the summary filed under
 * it becomes a member's summary the moment the token refreshes - no migration,
 * and nothing to move.
 */

export interface ReadVisitSummaryRequest {
  visitId?: unknown;
  /** The restaurant the visit belongs to, needed only to find the session. */
  restaurantId?: unknown;
  /** The table the guest scanned, which names their session document. */
  tableId?: unknown;
}

export interface VisitSummaryRead {
  ok: true;
  summary: VisitSummary;
}

export type ReadVisitSummaryResult = VisitSummaryRead | VisitSummaryRefused;

export interface ListVisitSummariesResult {
  ok: true;
  summaries: VisitSummary[];
}

/** The most meals one account's list will return in one call. */
export const MAX_VISIT_SUMMARIES = 50;

const uidOf = (request: CallableRequest<unknown>): string => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to see your visits.');
  }

  return request.auth.uid;
};

/**
 * Whether an unregistered guest may still read what they ate.
 *
 * A member always may, and is not asked for a session - they may be at home a
 * month later, and the account is the membership. An anonymous caller is asked
 * for the one they were given at the table, and it has to still be live: the
 * summary outlives the visit but not the guest's claim to it.
 *
 * The session is **not** required to be `active`. Closing the visit closes
 * every session under it in the same commit, so an active session is exactly
 * what a guest whose meal has ended does not have - requiring one would refuse
 * every summary this callable exists to serve. What is required is that it has
 * not gone idle, measured from the moment it last did something.
 */
const stillTheirs = async (
  request: CallableRequest<ReadVisitSummaryRequest>,
  uid: string,
  now: number,
): Promise<boolean> => {
  if (!isAnonymousSession(request)) {
    return true;
  }

  const restaurantId =
    typeof request.data?.restaurantId === 'string'
      ? request.data.restaurantId
      : '';
  const tableId =
    typeof request.data?.tableId === 'string' ? request.data.tableId : '';

  if (!restaurantId || !tableId) {
    return false;
  }

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);

  const [restaurant, session] = await Promise.all([
    restaurantRef.get(),
    restaurantRef
      .collection(TABLE_SESSIONS_COLLECTION)
      .doc(tableSessionId(tableId, uid))
      .get(),
  ]);

  if (!session.exists) {
    return false;
  }

  const data: DocumentData | undefined = session.data();
  const idleTimeoutMs = tableSessionIdleTimeoutMs(
    tableOrderingOf(restaurant.data() ?? {})['sessionIdleTimeoutMinutes'],
  );

  // The idle test is written out rather than borrowed from
  // `isExpiredSession`, because that helper answers `false` for an **ended**
  // session and every session this callable meets has ended - the visit
  // closing is what ended it, and is the event the summary exists because of.
  // What matters here is only the clock: going idle is the guest walking away
  // and not coming back, which is the window `RD-TS-46` closes.
  const lastActiveAt = data?.['lastActiveAt'];

  return typeof lastActiveAt === 'number' && now - lastActiveAt < idleTimeoutMs;
};

export const readVisitSummaryHandler = async (
  request: CallableRequest<ReadVisitSummaryRequest>,
  now: Date = new Date(),
): Promise<ReadVisitSummaryResult> => {
  const visitId = parseRequiredString(request.data?.visitId, 'visitId');
  const uid = uidOf(request);

  if (!(await stillTheirs(request, uid, now.getTime()))) {
    return refuseSummary('sessionExpired');
  }

  const document = await getFirestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(VISIT_SUMMARIES_COLLECTION)
    .doc(visitId)
    .get();

  if (!document.exists) {
    // Also the answer in the second after a close, before the trigger has
    // written it. "Not found" and "not yet" are one state to a reader, and the
    // screen says the summary is being prepared rather than that there is
    // none.
    return refuseSummary('notFound');
  }

  return { ok: true, summary: document.data() as VisitSummary };
};

/**
 * Every meal this account keeps, newest first.
 *
 * Members only, and not because an anonymous guest is untrusted: they have at
 * most the one meal they are sitting at, they reach it from the screen they
 * are already on, and a list is a thing an account has. Asking an anonymous
 * caller for a session per summary to list many would be a session per row.
 */
export const listVisitSummariesHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListVisitSummariesResult> => {
  const uid = uidOf(request);

  if (isAnonymousSession(request)) {
    return { ok: true, summaries: [] };
  }

  const documents = await getFirestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(VISIT_SUMMARIES_COLLECTION)
    .orderBy('closedAt', 'desc')
    .limit(MAX_VISIT_SUMMARIES)
    .get();

  return {
    ok: true,
    summaries: documents.docs.map((entry) => entry.data() as VisitSummary),
  };
};

export const readVisitSummary = onAppCheck<
  ReadVisitSummaryRequest,
  Promise<ReadVisitSummaryResult>
>((request) => readVisitSummaryHandler(request));

export const listVisitSummaries = onAppCheck<
  unknown,
  Promise<ListVisitSummariesResult>
>((request) => listVisitSummariesHandler(request));

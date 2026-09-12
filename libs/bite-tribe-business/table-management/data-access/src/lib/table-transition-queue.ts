import { TableStatus } from 'model';
import { TableTransitionFailure } from './table-transition-failure';
import { TableTransitionResult } from './table-state-data-access.service';

/**
 * What a staff member asked for while the signal was gone
 * (GitHub issue #1096).
 *
 * ## Why a transition is written down rather than simply retried
 *
 * The staff view is used in rooms the epic explicitly refuses to assume good
 * connectivity in - a basement dining room with two bars, a terrace at the far
 * end of the wifi. A seating made there has to survive the gap, and it has to
 * survive the tablet being locked, killed or reloaded inside it, because the
 * gap can be the length of a service. So the ask is a durable record rather
 * than a promise waiting to settle.
 *
 * ## What is in it, and what is deliberately not
 *
 * Everything the callable needs and nothing derived. In particular the
 * `expectedStatus` is the status the *device saw at the moment the host acted*,
 * not the status the server holds now - which is the whole point of it. A
 * queued transition replayed against a table somebody else has since moved
 * must be refused and shown to the host, and it is this field that makes that
 * refusal happen rather than a silent overwrite.
 *
 * The `requestId` is minted once, here, when the intent is recorded. Every
 * attempt to send it carries the same key, so the attempt that arrived but
 * whose answer was lost is recognised by the backend rather than applied
 * twice: two tables seated offline are two transitions on reconnect, not four.
 */
export interface QueuedTransition {
  /** The idempotency key, minted once per intent and reused by every attempt. */
  requestId: string;
  restaurantId: string;
  tableId: string;
  /** Where the table should end up. */
  status: TableStatus;
  /** What the device was showing when the staff member acted. */
  expectedStatus: TableStatus;
  /** Why, recorded on the audit entry. Absent when there is nothing to add. */
  reason?: string;
  /**
   * When the staff member made the change, on the device's clock.
   *
   * The queue replays in this order, and the staff view draws the table as
   * having held its new status since this moment - so a party seated twenty
   * minutes before the signal came back does not read as having just sat down.
   * It is never written to the database: the backend stamps its own `since` on
   * the transition it accepts, because two tablets must not disagree about
   * what time it is.
   */
  queuedAt: number;
}

/** What became of one transition the staff view asked for. */
export type TransitionOutcome =
  /** The backend took it, and the listener is about to say so. */
  | { outcome: 'applied'; result: TableTransitionResult }
  /** It never left the device, and is written down to be sent again. */
  | { outcome: 'queued'; entry: QueuedTransition }
  /** The backend refused it, and the staff member is owed a sentence. */
  | { outcome: 'rejected'; failure: TableTransitionFailure; error: unknown };

/**
 * A queued transition the backend would not take when it was finally sent.
 *
 * The acceptance criterion this exists for: a queued transition that conflicts
 * with server state is *surfaced* rather than silently dropped or silently
 * forced. Forcing it would mean re-sending it with whatever the table holds
 * now as the expectation, which is the same as having no expectation at all -
 * the host who freed table 12 an hour ago would seat it over the party
 * somebody else sat there since.
 */
export interface UnappliedTransition {
  entry: QueuedTransition;
  failure: TableTransitionFailure;
}

/**
 * Whether something read back out of device storage is a transition.
 *
 * The queue outlives the app version that wrote it, so what comes back is
 * untyped until it has been checked. A half-written or stale entry is dropped
 * rather than sent: a request the backend would refuse as malformed is one
 * more toast during a service, and a queue that cannot be parsed at all must
 * not take the page down with it.
 */
export const isQueuedTransition = (
  value: unknown,
): value is QueuedTransition => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Partial<Record<keyof QueuedTransition, unknown>>;

  return (
    typeof entry.requestId === 'string' &&
    entry.requestId.length > 0 &&
    typeof entry.restaurantId === 'string' &&
    typeof entry.tableId === 'string' &&
    typeof entry.status === 'string' &&
    typeof entry.expectedStatus === 'string' &&
    typeof entry.queuedAt === 'number'
  );
};

/** The queue as it was stored, with anything unreadable left out. */
export const parseQueue = (
  raw: string | null | undefined,
): QueuedTransition[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter(isQueuedTransition) : [];
  } catch {
    return [];
  }
};

/**
 * The entries that survive one refusal.
 *
 * A refused transition takes the rest of *that table's* queue with it, and
 * leaves every other table alone. Once the first move in a chain has been
 * refused, the ones behind it were expecting a status the table never reached:
 * a host who seated table 12 and then marked it ordering has two entries, and
 * if the seating is refused because a colleague got there first, the second is
 * not a separate problem to report - it is the same one, twice.
 *
 * Every dropped entry is still returned to the caller, so nothing disappears
 * without being shown. What is aggregated is the sentence, not the record.
 */
export const withoutTable = (
  queue: readonly QueuedTransition[],
  tableId: string,
): { kept: QueuedTransition[]; dropped: QueuedTransition[] } => ({
  kept: queue.filter((entry) => entry.tableId !== tableId),
  dropped: queue.filter((entry) => entry.tableId === tableId),
});

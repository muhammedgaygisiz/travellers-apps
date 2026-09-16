import type { ScanPosition } from './scan-anomaly';
import type {
  TableOrderingAvailability,
  TableScanContext,
  TableScanRefused,
} from './table-ordering';

/**
 * A guest's attachment to a table, from the scan until they leave it
 * (GitHub issue #1101).
 *
 * ## What a session is, given that a visit already exists
 *
 * A [[Table Visit]] is the *party* at a table: staff open it by seating
 * somebody and close it by freeing the table, and the orders and the bill hang
 * from it. It says nothing about who is holding a phone. A session is that
 * missing half - one document per guest, naming the visit they are ordering
 * into - and the two are deliberately not the same record, because a party of
 * four with two phones out is one visit and two sessions, and a guest who
 * closes their browser must not end the meal.
 *
 * ## A scan does not occupy the table
 *
 * The decision recorded for stage 2, and the whole reason `pending` exists.
 * A QR code establishes a table *context* and never a presence: the sticker can
 * be photographed, posted, or scanned from the car park. So a scan at a table
 * nobody has seated does not take that table out of service - it writes a
 * pending session, which is a signal staff confirm by seating the table in the
 * ordinary way. The worst a remote scan can do is put a line on a screen in the
 * restaurant.
 *
 * The confirmation is not a second staff action either. `transitionTableState`
 * activates a table's pending sessions in the very commit that opens its visit,
 * so the host who seats the party has already confirmed every guest who scanned
 * while waiting, without being asked about any of them.
 *
 * ## Joining is by construction
 *
 * "Two guests at one table end up in one visit" is not enforced by a check that
 * could be forgotten. The join path reads `TableState.visitId`, which is the
 * single pointer at an open visit and is written and dropped by the same commit
 * that moves the table's status. A second scanner therefore finds the visit the
 * first one is in, and a *closed* visit is unreachable rather than refused:
 * ending it dropped the pointer, so there is nothing left to join and the
 * second scanner gets a pending session, which is the truth - the party that
 * comes back for a coffee is a new party at that table.
 *
 * ## Storage
 *
 * ```text
 * /restaurants/{restaurantId}/tableSessions/{n}_{tableId}_{guestUserId}
 * ```
 *
 * Under the restaurant rather than under the visit, because a `pending` session
 * has no visit to live under and moving the document when it gains one would
 * make the id a guest holds change underneath them. The id is derived rather
 * than generated, which is what makes re-scanning the same code idempotent: the
 * second scan addresses the document the first one wrote instead of opening a
 * second session for one phone.
 *
 * The product rules are in `ssot/domain/table-visit.md`.
 */

/**
 * Every status a guest's session can hold.
 *
 * A `const` tuple rather than a bare union, following `TABLE_VISIT_STATUSES`:
 * the backend narrows a stored value at runtime and the scan screen switches
 * over the set exhaustively, and a union that exists only at compile time can
 * do neither.
 *
 * The three endings are three statuses rather than one ending plus a reason
 * field, because the guest is shown a different sentence for each and a
 * two-field state is a state two readers can disagree about.
 */
export const TABLE_SESSION_STATUSES = [
  /**
   * The guest scanned a table nobody has seated. Staff have not confirmed it.
   *
   * Ordering is not open here. What this buys the guest is that the restaurant
   * knows they are waiting, and what it costs the restaurant is one row on a
   * screen rather than a table marked occupied by somebody who may be outside.
   */
  'pending',
  /** Attached to an open visit. The guest may order. */
  'active',
  /** The guest ended it themselves. Nobody else's session is touched. */
  'left',
  /**
   * The idle timeout passed.
   *
   * The table where a party paid and walked out without anybody pressing
   * anything, and the pending session of somebody who scanned a sticker in a
   * photograph. Both stop being able to order, and both are told why.
   */
  'expired',
  /**
   * The visit ended under it.
   *
   * Kept apart from `expired` because the restaurant did this deliberately and
   * a timeout is nobody's decision, and the guest is owed the difference: one
   * is "your table was closed", the other is "you were away too long".
   */
  'closed',
] as const;

/** The status of one guest's session. */
export type TableSessionStatus = (typeof TABLE_SESSION_STATUSES)[number];

/**
 * The statuses a session can end in.
 *
 * Ending is one-way, as it is for a visit. A guest who wants back in scans
 * again, which writes a new session over the ended one rather than reviving it
 * - so a session that was closed with its visit cannot be resumed into a visit
 * that no longer exists.
 */
export const TABLE_SESSION_END_STATUSES: readonly TableSessionStatus[] = [
  'left',
  'expired',
  'closed',
];

/**
 * The statuses in which a session still stands between the guest and ordering.
 *
 * `pending` is in it and `active` is not, which is the point: this is what a
 * *new* scan at the same table must not duplicate, not what may place an order.
 * Ordering asks {@link isTableSessionActive}.
 */
export const TABLE_SESSION_LIVE_STATUSES: readonly TableSessionStatus[] = [
  'pending',
  'active',
];

/**
 * How long a session survives with nothing happening on it, in minutes, when
 * the restaurant has not said.
 *
 * Two hours, chosen to be longer than a meal rather than close to one. The cost
 * of being too short is a guest whose starter arrived being told they are no
 * longer at their table, which is absurd from the dining room; the cost of
 * being too long is a stale row on a staff screen, which is what closing the
 * visit clears anyway. So the default errs long and the restaurant shortens it
 * if its service is faster.
 */
export const DEFAULT_TABLE_SESSION_IDLE_MINUTES = 120;

/** One document per guest per table, under the restaurant. */
export const TABLE_SESSIONS_COLLECTION = 'tableSessions';

/**
 * The document id for one guest at one table.
 *
 * Derived rather than generated, so the same phone scanning the same code twice
 * addresses one document rather than opening a second session.
 *
 * The leading length is what makes the derivation injective, and it is there
 * because a plain separator is not enough. A Firestore document id may not
 * contain `/`, so the separator has to be a character both halves are allowed
 * to carry - and then `table_` with `guest` and `table` with `_guest` produce
 * the same name however many of them are used. Two guests at one table would
 * share a document, each silently overwriting the other's session.
 *
 * Today neither half can: a `tableId` is a v4 UUID from `createEntityId` and a
 * uid is alphanumeric. That is an accident of two generators rather than a rule
 * anybody stated, and the thing it would break is invisible from the dining
 * room, so the length is cheaper than the assumption. Reading a name back is
 * unambiguous: take the number, take that many characters, and the rest after
 * the separator is the uid.
 */
export const tableSessionId = (tableId: string, guestUserId: string): string =>
  `${tableId.length}_${tableId}_${guestUserId}`;

/** A guest's attachment to a table. Carries no order and no total. */
export interface TableSession {
  /** Equal to the document id, from {@link tableSessionId}. */
  id: string;
  /** The owning restaurant, repeated from the path so a query can filter it. */
  restaurantId: string;
  /** The table that was scanned. A plain id, as on the visit. */
  tableId: string;
  /** The account that scanned, anonymous or not. */
  guestUserId: string;
  status: TableSessionStatus;
  /**
   * The visit this guest is ordering into. Absent while `pending`.
   *
   * Written by the commit that attaches the session to an open visit, whether
   * that is the scan finding one or the seating opening one. It is never
   * rewritten afterwards: a visit that moves tables keeps its id, which is the
   * whole reason an order names the visit rather than the table.
   */
  visitId?: string;
  /** When the guest first scanned this table, in epoch milliseconds. */
  startedAt: number;
  /**
   * The last time the guest did something, in epoch milliseconds.
   *
   * What the idle timeout is measured from. A re-scan touches it, and so will
   * submitting an order once issue #1103 exists - which is the point of
   * measuring activity rather than age: a party three hours into a long dinner
   * that is still ordering has not gone idle.
   */
  lastActiveAt: number;
  /** When the session ended. Absent while it is `pending` or `active`. */
  endedAt?: number;
  /**
   * Whether the guest was anonymous when the session started.
   *
   * Recorded at the start and never updated, because upgrading an anonymous
   * account keeps its uid: without this, a guest who registers halfway through
   * dinner would make the session read as though it had always belonged to a
   * member. It is what "upgradeable later without losing the session" can be
   * checked against.
   */
  isAnonymousGuest: boolean;
}

/** Whether an unknown value is a session status this model knows. */
export const isTableSessionStatus = (
  value: unknown,
): value is TableSessionStatus =>
  typeof value === 'string' &&
  (TABLE_SESSION_STATUSES as readonly string[]).includes(value);

/**
 * Whether this session may place an order.
 *
 * `active` and nothing else. Deliberately not "not ended", which would admit
 * `pending` - the status whose entire meaning is that staff have not confirmed
 * the guest is there.
 *
 * It does not consider the clock. Expiry is {@link isTableSessionExpired},
 * which needs the restaurant's timeout and an instant, and folding the two
 * together would give a caller holding neither an answer that looks complete.
 */
export const isTableSessionActive = (
  session: Pick<TableSession, 'status'>,
): boolean => session.status === 'active';

/** Whether this session has ended, for any of the three reasons. */
export const isTableSessionEnded = (
  session: Pick<TableSession, 'status'>,
): boolean => TABLE_SESSION_END_STATUSES.includes(session.status);

/**
 * The idle timeout of a restaurant, in milliseconds.
 *
 * A restaurant that has not configured one, or has configured a number that is
 * not one, gets {@link DEFAULT_TABLE_SESSION_IDLE_MINUTES}. Zero and negative
 * are refused rather than honoured: a timeout of zero expires every session the
 * instant it is written, which is a configuration mistake that would read from
 * the dining room as the feature being broken.
 */
export const tableSessionIdleTimeoutMs = (
  sessionIdleTimeoutMinutes: unknown,
): number =>
  (typeof sessionIdleTimeoutMinutes === 'number' &&
  Number.isFinite(sessionIdleTimeoutMinutes) &&
  sessionIdleTimeoutMinutes > 0
    ? sessionIdleTimeoutMinutes
    : DEFAULT_TABLE_SESSION_IDLE_MINUTES) *
  60 *
  1000;

/**
 * Whether this session has gone idle for longer than the restaurant allows.
 *
 * A predicate rather than a scheduled sweep, which is the whole expiry design.
 * A session nobody touches costs nothing and matters to nobody, so paying for a
 * job that walks every restaurant every few minutes to write a status no reader
 * is waiting on would be paying for tidiness. The moment expiry matters is the
 * moment somebody asks - the guest trying to order, or the staff screen drawing
 * the pending list - and both ask this.
 *
 * The callables persist what they observe, so a document that is read after it
 * expired stops being read as live by anything that only knows the status. That
 * makes the write a consequence of a question rather than a precondition for
 * asking one.
 *
 * An ended session is never expired: it already has an ending, and re-labelling
 * a guest who left as having timed out would rewrite what happened.
 */
export const isTableSessionExpired = (
  session: Pick<TableSession, 'status' | 'lastActiveAt'>,
  idleTimeoutMs: number,
  now: number,
): boolean =>
  !isTableSessionEnded(session) && now - session.lastActiveAt >= idleTimeoutMs;

/** What the client sends to start or re-join a session. */
export interface StartTableSessionRequest {
  /** The scanned token, exactly as `resolveTableQrToken` takes it. */
  token: string;
  /**
   * A coarse position the guest chose to share (GitHub issue #1107).
   *
   * Optional in the strong sense: nothing about the session, the status, the
   * visit or the menu differs between a request that carries one and a request
   * that does not. The only thing it can produce is a row on a screen the guest
   * never sees, and only when the scan was far enough away to be worth one.
   *
   * Absent for a guest who did not tick the box, one whose device has no fix,
   * and one on a build that predates the field. The coordinates are compared to
   * the restaurant's and discarded - see `scan-anomaly.ts`, which owns the
   * shape and the reasoning.
   */
  position?: ScanPosition;
}

/** What the client sends to end its own session. */
export interface LeaveTableSessionRequest {
  restaurantId: string;
  tableId: string;
}

/**
 * A session that was started or re-joined.
 *
 * It carries the scan context as well as the session, because starting re-runs
 * the twelve checks of issue #1100 against documents that move during a
 * service - the restaurant pauses, the clock passes closing time - and a client
 * that had to hold the earlier resolution and trust it would be rendering the
 * restaurant's name from a minute ago. One answer, one screen.
 */
export interface TableSessionStarted {
  ok: true;
  /** `pending` or `active`. Never an ended status: this call just wrote it. */
  status: Extract<TableSessionStatus, 'pending' | 'active'>;
  session: TableSession;
  context: TableScanContext;
}

/**
 * A scan that resolved to a restaurant the guest cannot order from
 * (GitHub issue #1102).
 *
 * A third outcome, because #1102 made "resolved" and "orderable" two different
 * things. A menu-only restaurant resolves - the code is valid, the table is
 * real, the menu is worth reading - and takes no orders, so a session there is
 * one that can never be used.
 *
 * The client already knows, because the scan said so. This is what comes back
 * when it asks anyway, which it will: the kitchen can pause between the scan
 * and the tap.
 */
export interface TableSessionOrderingUnavailable {
  ok: false;
  ordering: Extract<TableOrderingAvailability, { available: false }>;
}

/**
 * What `startTableSession` answers with.
 *
 * The refusal is {@link TableScanRefused} unchanged, and deliberately not a
 * second reason list. Starting a session *is* a scan plus a write, so every way
 * it can fail before the write is a way the scan can fail, and a guest at a
 * table is owed the same ten sentences whichever call produced them. A parallel
 * set would be ten more strings to translate that mean the same things.
 */
export type StartTableSessionResult =
  TableSessionStarted | TableSessionOrderingUnavailable | TableScanRefused;

/**
 * Whether a start failed because the restaurant takes no orders here.
 *
 * A guard rather than an `'ordering' in result`, so the three-way narrowing is
 * written once: a screen that gets this back has a menu to offer, and one that
 * gets a refusal has nothing.
 */
export const isTableOrderingUnavailable = (
  result: StartTableSessionResult,
): result is TableSessionOrderingUnavailable =>
  !result.ok && 'ordering' in result;

/** Whether a start resolved, as a type guard. */
export const isTableSessionStarted = (
  result: StartTableSessionResult,
): result is TableSessionStarted => result.ok;

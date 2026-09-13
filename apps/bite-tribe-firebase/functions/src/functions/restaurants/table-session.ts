import { DocumentData } from 'firebase-admin/firestore';

/**
 * A guest's attachment to a table, as the backend has to know it
 * (GitHub issue #1101).
 *
 * ## Why this is a second copy
 *
 * The single definition is `table-session.ts` in `libs/bite-tribe-common/model`
 * and it carries the reasoning. This project cannot import it: it compiles with
 * its own `tsconfig.json`, whose `rootDir` is `src` and which carries none of
 * the workspace path mappings, and the deploy uploads `lib/` alone - the wall
 * `shared/roles.ts`, `table-state.ts`, `table-visit.ts` and `table-scan.ts`
 * each hit, answered the same way. `src/__specs__/table-session-parity.spec.ts`
 * reads both files as text and fails the build when the statuses, the end set,
 * the live set, the default timeout or the id derivation disagree.
 *
 * The drift this guards against is the id. `tableSessionId` is computed on both
 * sides - the guest's phone subscribes to its own document by deriving the
 * name, and the backend writes it - so a separator changed in one file and not
 * the other would leave a guest watching a document nothing ever writes, with
 * both codebases passing their own tests.
 *
 * ## Storage
 *
 * ```text
 * /restaurants/{restaurantId}/tableSessions/{n}_{tableId}_{guestUserId}
 * ```
 */

/** Every status a guest's session can hold. */
export const TABLE_SESSION_STATUSES = [
  'pending',
  'active',
  'left',
  'expired',
  'closed',
] as const;

export type TableSessionStatus = (typeof TABLE_SESSION_STATUSES)[number];

/**
 * The statuses a session can end in.
 *
 * Ending is one-way, as it is for a visit. A guest who wants back in scans
 * again, which writes a new session over the ended one rather than reviving it.
 */
export const TABLE_SESSION_END_STATUSES: readonly TableSessionStatus[] = [
  'left',
  'expired',
  'closed',
];

/**
 * The statuses in which a session still stands between the guest and ordering.
 *
 * `pending` is in it and `active` is not: this is what a new scan at the same
 * table must not duplicate, not what may place an order.
 */
export const TABLE_SESSION_LIVE_STATUSES: readonly TableSessionStatus[] = [
  'pending',
  'active',
];

/** The idle timeout used when the restaurant has not configured one. */
export const DEFAULT_TABLE_SESSION_IDLE_MINUTES = 120;

/** One document per guest per table, under the restaurant. */
export const TABLE_SESSIONS_COLLECTION = 'tableSessions';

/**
 * The document id for one guest at one table.
 *
 * Derived rather than generated, so one phone scanning one code twice addresses
 * one document instead of opening a second session. The leading length is what
 * makes the derivation injective: without it `table_` with `guest` and `table`
 * with `_guest` name the same document, and two guests at one table would share
 * a session. See the library copy for the whole argument.
 */
export const tableSessionId = (tableId: string, guestUserId: string): string =>
  `${tableId.length}_${tableId}_${guestUserId}`;

/** A guest's attachment to a table. Carries no order and no total. */
export interface TableSession {
  id: string;
  restaurantId: string;
  tableId: string;
  guestUserId: string;
  status: TableSessionStatus;
  /** The visit this guest is ordering into. Absent while `pending`. */
  visitId?: string;
  startedAt: number;
  /** What the idle timeout is measured from. A re-scan touches it. */
  lastActiveAt: number;
  /** When the session ended. Absent while it is `pending` or `active`. */
  endedAt?: number;
  /** Whether the guest was anonymous when the session started. */
  isAnonymousGuest: boolean;
}

/** Whether an unknown value is a session status this backend knows. */
export const isTableSessionStatus = (
  value: unknown,
): value is TableSessionStatus =>
  typeof value === 'string' &&
  (TABLE_SESSION_STATUSES as readonly string[]).includes(value);

/**
 * Whether a stored session has ended.
 *
 * Takes the raw document, because every caller here has just read one out of a
 * transaction. A document with no recognisable status counts as ended: it
 * cannot be ordered from, and treating one written by a later version as live
 * would let it hold a place in a party it may no longer belong to.
 */
export const isEndedSession = (session: DocumentData | undefined): boolean =>
  !TABLE_SESSION_LIVE_STATUSES.includes(
    session?.['status'] as TableSessionStatus,
  );

/**
 * The idle timeout of a restaurant, in milliseconds.
 *
 * Zero and negative are refused rather than honoured: a timeout of zero expires
 * every session the instant it is written, which is a configuration mistake
 * that reads from the dining room as the feature being broken.
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
 * Whether a stored session has gone idle for longer than the restaurant allows.
 *
 * A predicate rather than a scheduled sweep. A session nobody touches costs
 * nothing and matters to nobody; the moment expiry matters is the moment
 * somebody asks, and the callables persist what they observe so a document read
 * after it expired stops being read as live by anything that only knows the
 * status.
 */
export const isExpiredSession = (
  session: DocumentData | undefined,
  idleTimeoutMs: number,
  now: number,
): boolean => {
  if (isEndedSession(session)) {
    return false;
  }

  const lastActiveAt = session?.['lastActiveAt'];

  return (
    typeof lastActiveAt !== 'number' || now - lastActiveAt >= idleTimeoutMs
  );
};

/** The ordering settings of a restaurant document, however malformed. */
export const tableOrderingOf = (restaurant: DocumentData): DocumentData =>
  (restaurant['tableOrdering'] ?? {}) as DocumentData;

import { DocumentData } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';

/**
 * The live state of a table, as the backend has to know it
 * (GitHub issue #1092).
 *
 * ## Why this is a second copy
 *
 * The single definition is `TABLE_STATE_TRANSITIONS` in
 * `libs/bite-tribe-common/model` (issue #1091), and it should have been the
 * only one. It cannot be: this project compiles with its own `tsconfig.json`,
 * whose `rootDir` is `src` and which carries none of the workspace path
 * mappings, and the deploy uploads `lib/` alone - so an import that reached
 * across the workspace would not compile here and would not be in the
 * artifact if it did.
 *
 * That is the same wall `shared/roles.ts` hit, and this follows the same
 * answer: copy it, and make the copy checked rather than trusted.
 * `src/__specs__/table-state-parity.spec.ts` reads both files as text and fails
 * the build when the statuses or any row of the matrix disagree, so the drift
 * issue #1091 set out to prevent is caught by CI rather than by a staff member
 * finding that the button the app offered is the transition the backend
 * refuses.
 *
 * Keep the two in step by changing both. The library file is the source of the
 * decision and carries the reasoning; this one carries the same data and the
 * shapes only the backend writes.
 */

/**
 * Every live status a table can hold, in the order the lifecycle visits them.
 *
 * The order is part of what the parity spec compares, because the library's
 * `TableStatus` is derived from this array and a UI legend renders it.
 */
export const TABLE_STATUSES = [
  'available',
  'reserved',
  'occupied',
  'ordering',
  'awaitingPayment',
  'cleaning',
  'disabled',
] as const;

export type TableStatus = (typeof TABLE_STATUSES)[number];

/** The status of a table that has no state document. */
export const DEFAULT_TABLE_STATUS: TableStatus = 'available';

/**
 * Which statuses each status may move to. A status never lists itself.
 *
 * Re-applying the status a table already holds is a retry rather than a
 * transition: it would reset `since`, which is the clock the staff view is
 * built to display, and the request that replays one is answered by the
 * idempotency key of issue #1096 rather than by widening this.
 */
export const TABLE_STATE_TRANSITIONS: Readonly<
  Record<TableStatus, readonly TableStatus[]>
> = {
  available: ['reserved', 'occupied', 'cleaning', 'disabled'],
  reserved: ['occupied', 'available', 'disabled'],
  occupied: ['ordering', 'awaitingPayment', 'cleaning', 'available'],
  ordering: ['awaitingPayment', 'occupied', 'cleaning'],
  awaitingPayment: ['cleaning', 'available'],
  cleaning: ['available', 'disabled'],
  disabled: ['available'],
} as const;

/** Whether a table in `from` may move to `to`. */
export const canTransitionTableStatus = (
  from: TableStatus,
  to: TableStatus,
): boolean => TABLE_STATE_TRANSITIONS[from].includes(to);

/**
 * Whether an unknown value is a status this model knows.
 *
 * The requested status arrives over a callable and therefore from a client,
 * where the type says nothing. Narrowing through this is what keeps a typo or
 * a stale app version out of the database as a status no view has a colour
 * for.
 */
export const isTableStatus = (value: unknown): value is TableStatus =>
  typeof value === 'string' &&
  (TABLE_STATUSES as readonly string[]).includes(value);

/**
 * A status argument that arrived over a callable, narrowed or refused.
 *
 * Here rather than in `transition-table-state.ts`, where it started, because
 * `move-table-visit.ts` asks the same question of the same wire format and two
 * copies of an argument check are two chances to disagree about what a client
 * may send.
 */
export const parseTableStatus = (
  value: unknown,
  field: string,
): TableStatus => {
  const status = typeof value === 'string' ? value.trim() : '';

  if (!isTableStatus(status)) {
    throw new HttpsError(
      'invalid-argument',
      `${field} must be a known table status.`,
    );
  }

  return status;
};

/**
 * The statuses that hold a party at a table.
 *
 * Two rules read off this set rather than off a list repeated at each of them.
 * A table that is out of service may not *acquire* a party, so `reserved` and
 * `occupied` are refused on one - and they are the only way in, because
 * `ordering` and `awaitingPayment` are reachable only from `occupied`. And a
 * transition to a status outside this set ends the party, so the `visitId`
 * pointer is dropped rather than carried into a state that has no party to
 * point at.
 */
const PARTY_STATUSES: readonly TableStatus[] = [
  'reserved',
  'occupied',
  'ordering',
  'awaitingPayment',
];

/** Whether `status` means there is a party at the table. */
export const holdsParty = (status: TableStatus): boolean =>
  PARTY_STATUSES.includes(status);

/**
 * Whether moving to `status` is a table acquiring a party it did not have.
 *
 * `ordering` and `awaitingPayment` are excluded on purpose: they are reachable
 * only from `occupied`, so a table already has its party by the time it can
 * reach them, and refusing them on an out-of-service table would strand a
 * seated party that the owner disabled the table under.
 */
export const seatsParty = (status: TableStatus): boolean =>
  status === 'reserved' || status === 'occupied';

/**
 * One document per table at
 * `/restaurants/{restaurantId}/tableStates/{tableId}`.
 *
 * Written by `transitionTableState` and by nothing else - `firestore.rules`
 * refuses every client write, so "state changes are applied by the backend"
 * is enforced by the database rather than by the app being the only caller.
 */
export const TABLE_STATES_COLLECTION = 'tableStates';

/**
 * The audit trail, at
 * `/restaurants/{restaurantId}/tableStateTransitions/{transitionId}`.
 *
 * Under the restaurant rather than under the table's state document, for two
 * reasons. [[Table]] requires that deleting a table does not destroy the
 * history that references it, and a subcollection of the state goes when the
 * state does. And the question a disputed evening asks is "what happened in
 * this room tonight", which is one ordered read here and a fan-out across
 * every table the other way; "what happened at table 12" is still one `where`
 * on `tableId`.
 */
export const TABLE_STATE_TRANSITIONS_COLLECTION = 'tableStateTransitions';

/** What a table is doing right now. Carries no geometry, capacity or label. */
export interface TableState {
  tableId: string;
  restaurantId: string;
  status: TableStatus;
  /**
   * When the table entered `status`, in epoch milliseconds.
   *
   * The moment of the last accepted transition rather than of the last write,
   * because what the staff view displays is a duration. Stamped here, on one
   * clock, so two devices cannot disagree about it.
   */
  since: number;
  /** The account that made the transition into `status`. */
  updatedByUserId: string;
  /** The open visit at this table, while there is one (issue #1095). */
  visitId?: string;
  /** A short free-text note from staff. Never parsed. */
  note?: string;
}

/**
 * One accepted transition, appended and never updated.
 *
 * The fields issue #1092 asks for - from, to, actor, timestamp, reason - plus
 * the actor's roles, because "who changed this" and "in what capacity" are
 * different questions when an owner, a staff member and a support operator can
 * all reach the same table.
 *
 * `at` is epoch milliseconds and equals the `since` written on the state in the
 * same transaction, so the history and the clock on screen cannot disagree.
 * `atIso` is the same instant for a human reading the console, which is where a
 * disputed table is actually looked at.
 */
export interface TableStateTransition {
  tableId: string;
  restaurantId: string;
  from: TableStatus;
  to: TableStatus;
  actorUserId: string;
  actorRoles: string[];
  at: number;
  atIso: string;
  /**
   * The visit this transition opened, carried or ended (issue #1095).
   *
   * Absent when the table had no party either side of the change. It is what
   * makes the trail the *visit's* history as well as the table's: "which tables
   * did this party sit at" is one `where` on `visitId`, which is how a moved
   * visit keeps a history without copying one onto the visit document where it
   * could disagree with this.
   */
  visitId?: string;
  /** Why, where the caller gave a reason. Absent otherwise. */
  reason?: string;
  /**
   * How the visit this transition ended was recorded (issue #1095).
   *
   * Written only where a visit actually ended, so a replay of this transition
   * can be answered with the outcome the first attempt produced rather than
   * with the default. See `requestId` below for why a replay is answered at
   * all.
   */
  visitOutcome?: string;
  /**
   * The caller's idempotency key, where it sent one (issue #1096).
   *
   * It is also this document's id, which is what makes the dedupe a `create`
   * rather than a query: a replay of a transition that already landed finds
   * this entry and is answered with what it recorded, and two copies of one
   * request racing each other contend on this one document. The field is
   * written as well as used as the id so the trail is readable without
   * consulting document names.
   *
   * Absent on an entry written before the key existed, and on any caller that
   * does not send one.
   */
  requestId?: string;
}

/**
 * The live status of a table, given its state document or the absence of one.
 *
 * The absence is the ordinary case rather than an error: nothing writes a state
 * document until a staff member first acts on that table, so every table of
 * every restaurant reads `available` until it does. One reader, so the default
 * is one decision instead of one per call site with one of them forgotten.
 */
export const tableStatusOf = (state: DocumentData | undefined): TableStatus => {
  const status = state?.['status'];

  return isTableStatus(status) ? status : DEFAULT_TABLE_STATUS;
};

/** The open visit a state document points at, if it points at one. */
export const visitIdOf = (state: DocumentData | undefined): string => {
  const visitId = state?.['visitId'];

  return typeof visitId === 'string' ? visitId : '';
};

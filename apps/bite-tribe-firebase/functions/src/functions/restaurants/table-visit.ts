import { DocumentData } from 'firebase-admin/firestore';
import { TableStatus } from './table-state';

/**
 * A party at a table over time, as the backend has to know it
 * (GitHub issue #1095).
 *
 * ## Why this is a second copy
 *
 * The single definition is `table-visit.ts` in `libs/bite-tribe-common/model`,
 * and it should have been the only one. It cannot be, for the reason spelled
 * out on `table-state.ts` next door: this project compiles with its own
 * `tsconfig.json`, whose `rootDir` is `src` and which carries none of the
 * workspace path mappings, and the deploy uploads `lib/` alone.
 *
 * So the answer is the same one `shared/roles.ts` and `table-state.ts` reached:
 * copy it, and make the copy checked rather than trusted.
 * `src/__specs__/table-visit-parity.spec.ts` reads both files as text and fails
 * the build when the statuses, the end set or the status a table lands on after
 * a visit disagree.
 *
 * ## Storage
 *
 * ```text
 * /restaurants/{restaurantId}/visits/{visitId}
 * ```
 *
 * Under the restaurant and not under the table. A table deleted from the floor
 * plan takes its subcollections with it, and the record of what happened at
 * that table in November is the one thing that must not go - so `tableId` is a
 * plain string here, still naming a table that no longer exists.
 */

/** Every status a visit can hold. */
export const TABLE_VISIT_STATUSES = ['open', 'closed', 'abandoned'] as const;

export type TableVisitStatus = (typeof TABLE_VISIT_STATUSES)[number];

/**
 * The statuses a visit can end in.
 *
 * Ending is one-way: a closed visit is never reopened, because the party that
 * comes back for a coffee is a new party at that table. The backend refuses a
 * second ending rather than overwriting `closedAt` with a later instant that
 * describes nothing.
 */
export const TABLE_VISIT_END_STATUSES: readonly TableVisitStatus[] = [
  'closed',
  'abandoned',
];

/**
 * The status a table holds once its visit has ended.
 *
 * "Closing a visit sets the table to a state that requires an explicit next
 * action, so tables are not silently reused" - the acceptance criterion of
 * issue #1095, as data. A table whose party has just left has plates on it;
 * landing on `cleaning` means somebody has to look at it and say it is ready.
 *
 * This is what makes `occupied -> available` and `awaitingPayment -> available`
 * refusals while a visit is open, even though the matrix of issue #1091 allows
 * both. The matrix says what a *table* may do; this says what may happen to a
 * table that still has a party recorded at it.
 */
export const TABLE_STATUS_AFTER_VISIT: TableStatus = 'cleaning';

/** One document per visit at `/restaurants/{restaurantId}/visits/{visitId}`. */
export const TABLE_VISITS_COLLECTION = 'visits';

/** A party at a table, from the moment staff seat it until they end it. */
export interface TableVisit {
  /** Equal to the document id, and stable across a move to another table. */
  id: string;
  restaurantId: string;
  /** Where the party is sitting now. A plain id, so it outlives the table. */
  tableId: string;
  status: TableVisitStatus;
  /** When staff seated the party, in epoch milliseconds. */
  openedAt: number;
  /** When the visit ended. Absent while it is open. */
  closedAt?: number;
  /** How many guests, where staff recorded it. Absent rather than `0`. */
  guestCount?: number;
  openedByUserId: string;
  /** Who ended the visit. Absent while it is open. */
  closedByUserId?: string;
  /** Whether the restaurant has been paid. Absent means `unsettled`. */
  paymentStatus?: TableVisitPaymentStatus;
  /** How the party paid. Absent until the bill is settled. */
  settlementMethod?: TableVisitSettlementMethod;
  /** When staff recorded the settlement, in epoch milliseconds. */
  settledAt?: number;
  /** Which staff account recorded it. */
  settledByUserId?: string;
}

/**
 * Whether the restaurant has been paid for this visit (GitHub issue #1110).
 *
 * Two values and not five. `ADR-0004` decided BiteTribe is never in the money
 * flow at a table (`RD-TS-45`), so `pending`, `failed` and `refunded`
 * described a payment provider's state machine and there is no provider. The
 * party pays the restaurant, and this records that somebody said so.
 */
export const TABLE_VISIT_PAYMENT_STATUSES = ['unsettled', 'settled'] as const;

export type TableVisitPaymentStatus =
  (typeof TABLE_VISIT_PAYMENT_STATUSES)[number];

/**
 * How a party paid the restaurant.
 *
 * Three values and not free text, for the reason the cancellation reason is
 * capped (`RD-TS-16`): this is written during service by somebody holding a
 * card machine, and a sentence typed mid-rush is a field that is skipped or
 * filled with noise. `other` is what makes the short list honest.
 */
export const TABLE_VISIT_SETTLEMENT_METHODS = [
  'cash',
  'card',
  'other',
] as const;

export type TableVisitSettlementMethod =
  (typeof TABLE_VISIT_SETTLEMENT_METHODS)[number];

/** Whether an unknown value is a settlement method this backend knows. */
export const isTableVisitSettlementMethod = (
  value: unknown,
): value is TableVisitSettlementMethod =>
  typeof value === 'string' &&
  (TABLE_VISIT_SETTLEMENT_METHODS as readonly string[]).includes(value);

/**
 * Whether a stored visit has been settled.
 *
 * Takes the raw document, like {@link isOpenVisit} and for the same reason:
 * every caller has just read one out of a transaction. An absent
 * `paymentStatus` is `unsettled`, which is true of every visit opened before
 * the field existed - nothing had recorded a settlement, because nothing
 * could.
 */
export const isSettledVisit = (visit: DocumentData | undefined): boolean =>
  visit?.['paymentStatus'] === 'settled';

/**
 * Whether an unknown value is a visit status this backend knows.
 *
 * A status read back out of Firestore is `unknown` whatever the interface says,
 * and treating an unrecognised one as open would let a document written by a
 * later version block a table for good.
 */
export const isTableVisitStatus = (value: unknown): value is TableVisitStatus =>
  typeof value === 'string' &&
  (TABLE_VISIT_STATUSES as readonly string[]).includes(value);

/**
 * Whether a stored visit still holds its table.
 *
 * Takes the raw document rather than a `TableVisit`, because every caller here
 * has just read one out of a transaction. A document with no recognisable
 * status is not open: it cannot be ended, and the alternative is a table no
 * host can ever seat again.
 */
export const isOpenVisit = (visit: DocumentData | undefined): boolean =>
  visit?.['status'] === 'open';

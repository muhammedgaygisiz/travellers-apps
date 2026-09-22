import type { TableStatus } from './table-state';

/**
 * A party at a table over time (GitHub issue #1095).
 *
 * ## What a visit is for
 *
 * [[Table]] is a place and `TableState` is what that place is doing right now.
 * Neither can answer the question the rest of stage 3 is built on: *who is at
 * this table, what have they ordered, and have they paid?* A place cannot hold
 * that, because a place outlives the party - table 12 is the same table at
 * eight o'clock and at ten, and the two parties who sat at it are not the same
 * party.
 *
 * So the orders of issue #1072 and the payment of issue #1073 hang from the
 * visit rather than from the table. That is what lets a party move: a party
 * that has ordered two starters and is asked to move to a bigger table keeps
 * its orders, because nothing about them named the table. Hanging orders off
 * the table instead would make a move either a data migration or a lost bill.
 *
 * ## Storage
 *
 * One document per visit at `/restaurants/{restaurantId}/visits/{visitId}`.
 *
 * Under the restaurant and **not** under the table, which is the whole of how a
 * visit survives its table being deleted from the floor plan. A restaurant that
 * rearranges its dining room in January must still be able to read what
 * happened at the table it removed, and a subcollection of the table goes when
 * the table goes. `tableId` is therefore a plain string and never a reference:
 * it keeps naming a table that no longer exists, which is exactly what a
 * historical record should do.
 *
 * ## The visit and the table state
 *
 * They point at each other and neither owns the other. `TableState.visitId` is
 * the pointer the live view follows to reach the party at a table it is already
 * rendering; `TableVisit.tableId` is where the party is sitting now. Both are
 * written in one transaction by the backend, so a visit open at a table whose
 * state points at nothing cannot exist.
 *
 * The history of a visit - which tables it sat at and when - is not a field
 * here. It is `tableStateTransitions`, the append-only trail of issue #1092,
 * whose entries carry the `visitId` they moved. A second copy on the visit
 * would be a second version of one fact, free to disagree with the trail a
 * disputed evening is actually read from.
 *
 * The product rules are in `ssot/domain/table-visit.md`.
 */

/**
 * Every status a visit can hold.
 *
 * A `const` tuple rather than a bare union, for the same reason as
 * `TABLE_STATUSES`: the backend narrows a stored value at runtime and a receipt
 * list renders a filter, and a union that exists only at compile time cannot be
 * iterated.
 */
export const TABLE_VISIT_STATUSES = [
  /** The party is at the table. At most one per table, ever. */
  'open',
  /** The party left and staff ended the visit. The ordinary outcome. */
  'closed',
  /**
   * The visit ended without staff ending it.
   *
   * A table left open overnight, or a party that walked out. It is kept apart
   * from `closed` because a bill reconciled at the end of service and a bill
   * nobody ever looked at are different facts, and stage 4 charges for one of
   * them.
   */
  'abandoned',
] as const;

/** The status of one visit. */
export type TableVisitStatus = (typeof TABLE_VISIT_STATUSES)[number];

/**
 * The statuses a visit can end in.
 *
 * Ending is one-way. A closed visit is not reopened - the party that comes back
 * for a coffee is a new party at that table - so this is the set nothing
 * transitions out of, and the backend refuses a second close rather than
 * overwriting `closedAt` with a later instant that describes nothing.
 */
export const TABLE_VISIT_END_STATUSES: readonly TableVisitStatus[] = [
  'closed',
  'abandoned',
];

/**
 * The status a table holds once its visit has ended.
 *
 * The rule issue #1095 states as "closing a visit sets the table to a state
 * that requires an explicit next action, so tables are not silently reused",
 * written as data rather than left as a sentence in two codebases. A table
 * whose party has just left is not ready for the next one: it has plates on it.
 * Landing on `cleaning` means somebody has to say the table is ready, and that
 * somebody is the person who looked at it.
 *
 * It is a value rather than a literal at each call site because the backend
 * writes it and the staff view predicts it - the button that ends a visit says
 * what the table will become, and the two disagreeing would make the view lie.
 */
export const TABLE_STATUS_AFTER_VISIT: TableStatus = 'cleaning';

/**
 * One subcollection per restaurant, holding its parties.
 *
 * ```text
 * /restaurants/{restaurantId}/visits/{visitId}
 * ```
 *
 * Spelled here by issue #1104, which gave the guest's phone the first reason to
 * build the path on this side: the orders it subscribes to are a subcollection
 * of one visit. The backend has held the same constant since issue #1095, and
 * `table-visit-parity.spec.ts` pins its value to the literal in
 * `firestore.rules`.
 */
export const TABLE_VISITS_COLLECTION = 'visits';

/**
 * A party at a table, from the moment staff seat it until the moment they end
 * it.
 *
 * Carries no order and no total. Those are the subcollection of issue #1072 and
 * the payment of issue #1073; a visit that copied them would be a cache of a
 * collection that changes while the party sits there.
 */
export interface TableVisit {
  /**
   * The visit's own identifier, equal to the document id.
   *
   * Stable for the visit's whole life, including across a move: moving a party
   * to another table changes `tableId` and touches nothing else, so every order
   * already pointing at this visit still points at it. That is the difference
   * between a move and a close-and-reopen, and it is why a move is one
   * operation rather than two.
   */
  id: string;
  /** The owning restaurant, repeated from the path so a query can filter it. */
  restaurantId: string;
  /**
   * The table the party is sitting at now.
   *
   * The current table and not the opening one. A visit that moved names where
   * the party is, because that is what every reader wants; where it has been is
   * in `tableStateTransitions`.
   *
   * A plain id rather than a reference, so it outlives the table's deletion.
   */
  tableId: string;
  /** Whether the party is still there. */
  status: TableVisitStatus;
  /** When staff seated the party, in epoch milliseconds. */
  openedAt: number;
  /**
   * When the visit ended, in epoch milliseconds. Absent while it is open.
   *
   * Absent rather than zero, so "still going" is a missing field instead of a
   * sentinel a reader has to know about. Epoch milliseconds throughout,
   * following `TableState.since`: a duration is arithmetic, and the number
   * crosses the Capacitor Firestore bridge as itself on every platform.
   */
  closedAt?: number;
  /**
   * How many guests, where staff recorded it.
   *
   * Optional, because the host who taps a table during a rush has not been
   * asked for a number and refusing the seating over it would cost more than
   * the field is worth. The seating flow of issue #1096 is what prompts for it;
   * until then a visit without one is a visit that was seated in a hurry, which
   * is true and worth recording as absent rather than as `0`.
   */
  guestCount?: number;
  /** The staff member or owner who seated the party. */
  openedByUserId: string;
  /** Who ended the visit. Absent while it is open. */
  closedByUserId?: string;
  /**
   * Whether the restaurant has been paid (GitHub issue #1110).
   *
   * Two values rather than the five this field was proposed with, because
   * `ADR-0004` decided BiteTribe is never in the money flow at a table
   * (`RD-TS-45`). `pending`, `failed` and `refunded` described a payment
   * provider's state machine, and there is no provider: the party pays the
   * restaurant, and this records that somebody said so.
   *
   * Absent means `unsettled`, which {@link isTableVisitSettled} is the one
   * place that knows. Every visit opened before this field existed reads as
   * unsettled, which is true of all of them - nothing had recorded a
   * settlement, because nothing could.
   */
  paymentStatus?: TableVisitPaymentStatus;
  /** How the party paid. Absent until the bill is settled. */
  settlementMethod?: TableVisitSettlementMethod;
  /** When staff recorded the settlement, in epoch milliseconds. */
  settledAt?: number;
  /** Which staff account recorded it. Absent until one has. */
  settledByUserId?: string;
}

/**
 * Whether the restaurant has been paid for this visit.
 *
 * A list rather than a boolean for the reason every other status here is one:
 * a screen renders the word, and a third value - a partly settled bill, a
 * disputed one - is a decision somebody may take later, which a boolean would
 * make a migration rather than an addition.
 */
export const TABLE_VISIT_PAYMENT_STATUSES = [
  /** Nobody has recorded a payment. The state every visit opens in. */
  'unsettled',
  /** Staff recorded that the party paid, and how. */
  'settled',
] as const;

/** Whether the restaurant has been paid. */
export type TableVisitPaymentStatus =
  (typeof TABLE_VISIT_PAYMENT_STATUSES)[number];

/**
 * How a party paid the restaurant (GitHub issue #1110).
 *
 * Three values and not free text, following the cap on
 * `TableOrder.cancellationReason` (`RD-TS-16`) and for a sharper version of
 * its reason: this is a **record of what happened at the table**, written
 * during service by somebody holding a card machine. A sentence typed mid-rush
 * is a field that is either skipped or filled with noise, and it could not be
 * counted afterwards. `other` is what makes the short list honest - a
 * restaurant taking a bank transfer is not forced to call it cash.
 *
 * It says nothing about a payment BiteTribe processed, because BiteTribe
 * processes none (`RD-TS-45`).
 */
export const TABLE_VISIT_SETTLEMENT_METHODS = [
  'cash',
  'card',
  'other',
] as const;

/** How the party paid. */
export type TableVisitSettlementMethod =
  (typeof TABLE_VISIT_SETTLEMENT_METHODS)[number];

/** Whether an unknown value is a payment status this model knows. */
export const isTableVisitPaymentStatus = (
  value: unknown,
): value is TableVisitPaymentStatus =>
  typeof value === 'string' &&
  (TABLE_VISIT_PAYMENT_STATUSES as readonly string[]).includes(value);

/** Whether an unknown value is a settlement method this model knows. */
export const isTableVisitSettlementMethod = (
  value: unknown,
): value is TableVisitSettlementMethod =>
  typeof value === 'string' &&
  (TABLE_VISIT_SETTLEMENT_METHODS as readonly string[]).includes(value);

/**
 * Whether the restaurant has been paid for this visit.
 *
 * The one place that knows an absent `paymentStatus` means `unsettled`, so
 * that the staff screen, the backend and the close confirmation of issue #1111
 * cannot disagree about a visit written before the field existed. A
 * `=== 'settled'` spread across three readers is three chances for one of them
 * to treat "no answer" as "paid".
 */
export const isTableVisitSettled = (
  visit: Pick<TableVisit, 'paymentStatus'>,
): boolean => visit.paymentStatus === 'settled';

/**
 * Whether an unknown value is a visit status this model knows.
 *
 * The backend reads a stored status back out of Firestore, where the type says
 * nothing, and treating an unrecognised one as open would let a document a
 * later version wrote block a table forever.
 */
export const isTableVisitStatus = (value: unknown): value is TableVisitStatus =>
  typeof value === 'string' &&
  (TABLE_VISIT_STATUSES as readonly string[]).includes(value);

/**
 * Whether this visit still holds its table.
 *
 * The one question the "at most one open visit per table" rule is asked in, so
 * it is answered in one place rather than by a `=== 'open'` comparison spread
 * across the backend, the live view and the receipt list, one of which would
 * eventually forget `abandoned`.
 */
export const isTableVisitOpen = (visit: Pick<TableVisit, 'status'>): boolean =>
  visit.status === 'open';

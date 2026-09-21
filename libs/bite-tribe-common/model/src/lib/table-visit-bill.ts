import type { OrderLineExtraSnapshot } from './order-line';
import type {
  TableVisitPaymentStatus,
  TableVisitSettlementMethod,
} from './table-visit';

/**
 * What the table owes, as the guest's phone is shown it
 * (GitHub issue #1110).
 *
 * ## Why this is not a Firestore read
 *
 * `RD-TS-12` decided that a guest's phone reads the orders **their own uid**
 * sent, because that is the only membership `firestore.rules` can prove: the
 * session document's name is derived from the table the guest *scanned*, and
 * the visit names the table the party is sitting at *now*, so a party that
 * moved would have the derivation miss. The shared bill it deferred is this,
 * and it arrives through a callable rather than by widening that rule.
 *
 * The callable is `readTableVisitBill`, and what it admits is a caller holding
 * an **active session on that visit** - the same party test
 * `requestTableAssistance` applies. A guest's phone still cannot `list` the
 * visit, and nothing in `firestore.rules` changed to make this possible.
 *
 * ## Why the lines are merged
 *
 * `RD-TS-47`. Two things fall out of merging identical lines, and only one of
 * them is that a bill reads like a bill.
 *
 * The other is that an **unmerged** bill leaks who ordered what. Orders hang
 * from the visit one document per submission (`RD-TS-9`), so lines that
 * arrived together came from one phone; a party of four would read four
 * groups and know which was theirs by elimination. Merging across the whole
 * visit destroys that grouping rather than asking a renderer to hide it, which
 * is the difference between a guarantee and a habit. There is no
 * `guestUserId` anywhere in this shape, and there must not be one.
 *
 * ## What it is not
 *
 * Not a receipt, not an invoice, and it carries no tax line and no document
 * number - `ADR-0004` and `RD-TS-46`. BiteTribe is not in the money flow; the
 * restaurant's own till issues whatever the law requires. This says what was
 * ordered and what it comes to.
 */

/**
 * One row of the bill: a dish, however many of it the table ordered.
 *
 * Deliberately not an `OrderLineSnapshot`. A snapshot records one submission -
 * which phone, which order, at what moment - and a bill row is the sum of
 * every submission that ordered the same thing. Reusing the snapshot here
 * would carry fields that are true of one of the merged lines and false of the
 * row.
 */
export interface TableVisitBillLine {
  /**
   * The dish, as the menu named it when it was ordered.
   *
   * Two rows can carry one `menuItemId` and different names, where the
   * restaurant renamed the dish mid-service. They stay two rows: the guest is
   * shown what they were shown when they ordered.
   */
  readonly menuItemId: string;
  readonly name: string;
  /** Which size or variant, where the dish has them. */
  readonly variantId?: string;
  readonly variantName?: string;
  /** What the guest asked for. Part of the merge key: two notes, two rows. */
  readonly notes?: string;
  /** The extras ticked on this row, priced into {@link unitPrice}. */
  readonly extras?: readonly OrderLineExtraSnapshot[];
  /** How many of this row the table ordered, summed across every order. */
  readonly quantity: number;
  /**
   * What one of them costs, the dish plus its extras.
   *
   * `orderLineUnitPrice` of the lines that merged into this row, every one of
   * which agreed - a differing price is a different row, because a restaurant
   * that reprices mid-meal has sold the guest two different things.
   */
  readonly unitPrice: number;
  /** {@link unitPrice} times {@link quantity}. */
  readonly lineTotal: number;
}

/** What the table owes, and what the restaurant has recorded about it. */
export interface TableVisitBill {
  readonly restaurantId: string;
  readonly visitId: string;
  /** Where the party is sitting now, which is the visit's table. */
  readonly tableId: string;
  /** ISO 4217, read off the orders and equal on every one of them. */
  readonly currency: string;
  /** Every dish the table ordered, merged, cancelled orders excluded. */
  readonly lines: readonly TableVisitBillLine[];
  /** The sum of every {@link TableVisitBillLine.lineTotal}. */
  readonly total: number;
  /** Whether the restaurant has recorded a payment. */
  readonly paymentStatus: TableVisitPaymentStatus;
  /** How the party paid, once staff recorded it. */
  readonly settlementMethod?: TableVisitSettlementMethod;
  /**
   * How many orders the bill was built from, cancelled ones excluded.
   *
   * Shown to nobody. It is what makes an empty bill readable: a party that has
   * ordered nothing and a party whose only order was cancelled are both a
   * total of zero, and the screen says different things about them.
   */
  readonly orderCount: number;
}

/**
 * Why a bill could not be read.
 *
 * The same four the assistance and order callables answer with, and
 * deliberately the same words: a guest whose session has expired is told one
 * sentence by this screen and by the one next to it, because it is one fact.
 */
export const TABLE_VISIT_BILL_REFUSAL_REASONS = [
  /** This phone has no session at that table. */
  'sessionNotFound',
  /** It has one, and it is `pending`, `left` or `closed`. */
  'sessionNotActive',
  /** It went idle past the timeout the restaurant configured. */
  'sessionExpired',
  /** The session names no visit, or the visit has ended. */
  'visitClosed',
] as const;

/** Why a bill could not be read. */
export type TableVisitBillRefusalReason =
  (typeof TABLE_VISIT_BILL_REFUSAL_REASONS)[number];

/** The bill could not be read, and this is why. */
export interface TableVisitBillRefused {
  readonly ok: false;
  readonly reason: TableVisitBillRefusalReason;
}

/** The bill was read. */
export interface TableVisitBillRead {
  readonly ok: true;
  readonly bill: TableVisitBill;
}

/** What `readTableVisitBill` answers with. */
export type ReadTableVisitBillResult =
  TableVisitBillRead | TableVisitBillRefused;

/** Whether an unknown value is a refusal reason this model knows. */
export const isTableVisitBillRefusalReason = (
  value: unknown,
): value is TableVisitBillRefusalReason =>
  typeof value === 'string' &&
  (TABLE_VISIT_BILL_REFUSAL_REASONS as readonly string[]).includes(value);

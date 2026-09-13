import { DocumentData } from 'firebase-admin/firestore';

/**
 * What a party at a table sent to the kitchen, as the backend has to know it
 * (GitHub issue #1103).
 *
 * ## Why this is a second copy
 *
 * The single definition is `table-order.ts` in `libs/bite-tribe-common/model`
 * and it carries the reasoning. This project cannot import it: it compiles with
 * its own `tsconfig.json`, whose `rootDir` is `src` and which carries none of
 * the workspace path mappings, and the deploy uploads `lib/` alone - the wall
 * `shared/roles.ts`, `table-state.ts`, `table-visit.ts`, `table-scan.ts` and
 * `table-session.ts` each hit, answered the same way.
 * `src/__specs__/table-order-parity.spec.ts` reads both files as text and fails
 * the build when the statuses, the end set, the transition matrix, the refusal
 * reasons or the collection name disagree.
 *
 * Two of those drift silently and badly. A refusal reason the backend returns
 * and the client has no sentence for renders as a blank line in front of a
 * guest who cannot order and is not told why. And a transition the staff queue
 * of issue #1105 believes is legal, but this side refuses, is a button that
 * does nothing.
 *
 * ## Storage
 *
 * ```text
 * /restaurants/{restaurantId}/visits/{visitId}/orders/{orderId}
 * ```
 */

/** Every status an order can hold, in the order the lifecycle visits them. */
export const TABLE_ORDER_STATUSES = [
  'submitted',
  'accepted',
  'preparing',
  'served',
  'cancelled',
] as const;

export type TableOrderStatus = (typeof TABLE_ORDER_STATUSES)[number];

/** The status every order starts in, and the only one this issue writes. */
export const INITIAL_TABLE_ORDER_STATUS: TableOrderStatus = 'submitted';

/**
 * The statuses an order can end in.
 *
 * Ending is one-way, as it is for a visit and a session. The guest who still
 * wants a cancelled dish orders it again, which is a new order.
 */
export const TABLE_ORDER_END_STATUSES: readonly TableOrderStatus[] = [
  'served',
  'cancelled',
];

/**
 * Which statuses each status may move to. A status never lists itself.
 *
 * `preparing` is skippable: a restaurant that plates a dessert as it is ordered
 * has no preparing stage worth recording. Nothing leaves `served` or
 * `cancelled`.
 */
export const TABLE_ORDER_STATUS_TRANSITIONS: Readonly<
  Record<TableOrderStatus, readonly TableOrderStatus[]>
> = {
  submitted: ['accepted', 'cancelled'],
  accepted: ['preparing', 'served', 'cancelled'],
  preparing: ['served', 'cancelled'],
  served: [],
  cancelled: [],
} as const;

/** Whether an order in `from` may move to `to`. */
export const canTransitionTableOrderStatus = (
  from: TableOrderStatus,
  to: TableOrderStatus,
): boolean => TABLE_ORDER_STATUS_TRANSITIONS[from].includes(to);

/** Whether an unknown value is an order status this backend knows. */
export const isTableOrderStatus = (value: unknown): value is TableOrderStatus =>
  typeof value === 'string' &&
  (TABLE_ORDER_STATUSES as readonly string[]).includes(value);

/** One subcollection per visit, under the restaurant. */
export const TABLE_ORDERS_COLLECTION = 'orders';

/**
 * One line of an order, as the restaurant recorded it.
 *
 * The library's `OrderLineSnapshot`, which issue #1099 wrote for this issue and
 * which carries the argument for why a line copies the menu instead of pointing
 * at it. Every field is `readonly` there and here: nothing edits a line after
 * it is submitted, and a correction is a cancellation with a reason.
 */
export interface OrderLineSnapshot {
  readonly menuItemId: string;
  readonly name: string;
  readonly variantId?: string;
  readonly variantName?: string;
  readonly price: number;
  readonly currency: string;
  readonly quantity: number;
  readonly notes?: string;
}

/** One order, as one party sent it. */
export interface TableOrder {
  id: string;
  restaurantId: string;
  visitId: string;
  /** Where the party was sitting when they sent it. A record, not an address. */
  tableId: string;
  sessionId: string;
  guestUserId: string;
  status: TableOrderStatus;
  lines: OrderLineSnapshot[];
  currency: string;
  /** Always `tableOrderTotal(lines)` at the moment of writing. */
  total: number;
  submittedAt: number;
  /** Equal to `submittedAt` on a new order rather than absent. */
  statusChangedAt: number;
  /**
   * Why the restaurant cancelled it (GitHub issue #1104).
   *
   * Declared here and written by nothing yet. The guest's screen renders it,
   * which is where the shape was decided; the staff cancellation that fills it
   * is issue #1105, and it writes through this side. Declaring it with the
   * reader rather than with the writer is what stops the two from meeting as
   * two different fields.
   */
  cancellationReason?: string;
}

/**
 * What one order comes to.
 *
 * The same arithmetic as the library's `tableOrderTotal`, so the running total
 * the guest agreed to and the total this side records are one number. The
 * parity spec compares the two implementations as text.
 */
export const tableOrderTotal = (
  lines: readonly Pick<OrderLineSnapshot, 'price' | 'quantity'>[],
): number => lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

/** The largest quantity one line may carry. */
export const MAX_ORDER_LINE_QUANTITY = 99;

/** The most lines one order may carry. */
export const MAX_ORDER_LINES = 60;

/** Why an order was not accepted. */
export const TABLE_ORDER_REFUSAL_REASONS = [
  'sessionNotFound',
  'sessionNotActive',
  'sessionExpired',
  'visitClosed',
  'orderingUnavailable',
  'tableNotOrderable',
  'menuMissing',
  'menuCurrencyMissing',
  'emptyOrder',
  'itemMissing',
  'itemUnavailable',
  'priceChanged',
  'currencyChanged',
] as const;

export type TableOrderRefusalReason =
  (typeof TABLE_ORDER_REFUSAL_REASONS)[number];

/** The item a refusal is about, where it is about one. */
export interface TableOrderRefusedItem {
  menuItemId: string;
  variantId?: string;
  /** The item's name on the menu now. Absent when it has been deleted. */
  name?: string;
  shownPrice?: number;
  currentPrice?: number;
}

export interface TableOrderRefused {
  ok: false;
  reason: TableOrderRefusalReason;
  item?: TableOrderRefusedItem;
}

/**
 * A refusal, assembled in one place.
 *
 * A function rather than an object literal at each of the twelve return sites,
 * following `refuseScan`: the optional item is dropped rather than written as
 * `undefined`, which is what a callable's JSON would otherwise carry to a
 * client that checks `'item' in result`.
 */
export const refuseOrder = (
  reason: TableOrderRefusalReason,
  item?: TableOrderRefusedItem,
): TableOrderRefused => ({ ok: false, reason, ...(item ? { item } : {}) });

/**
 * The statuses an order may be placed from.
 *
 * `occupied` is a party seated and not yet ordering, which is where a first
 * order comes from; `ordering` is the same party sending a second one. Nothing
 * else: a table being cleaned or taken out of service while a visit is somehow
 * still open means the floor and the visit disagree, and the guest is told to
 * ask a member of staff rather than having an order recorded against a table
 * nobody is at.
 *
 * `awaitingPayment` is deliberately excluded. The bill has been asked for, and
 * a dish added after that is a conversation with a member of staff rather than
 * a tap - which is issue #1106's territory, not this one's.
 */
export const ORDERABLE_TABLE_STATUSES: readonly string[] = [
  'occupied',
  'ordering',
];

/** Whether a stored order document has a status this backend knows. */
export const orderStatusOf = (
  order: DocumentData | undefined,
): TableOrderStatus | undefined => {
  const status = order?.['status'];

  return isTableOrderStatus(status) ? status : undefined;
};

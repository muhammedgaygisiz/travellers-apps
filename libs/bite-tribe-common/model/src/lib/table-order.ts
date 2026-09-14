import type { OrderLineSnapshot } from './order-line';
import type { TableStatus } from './table-state';

/**
 * What a party at a table sent to the kitchen (GitHub issue #1103).
 *
 * ## Why it hangs from the visit
 *
 * ```text
 * /restaurants/{restaurantId}/visits/{visitId}/orders/{orderId}
 * ```
 *
 * Under the visit and not under the table, which is the whole of how a party
 * that moves keeps its dinner. [[Table Visit]] is the party; a table is a place
 * the party happens to be standing at, and a party asked to move to a bigger
 * table would otherwise either lose two starters or need a data migration to
 * keep them. {@link TableOrder.tableId} is still recorded, as a plain string,
 * because "which table did this reach the pass from" is a question the kitchen
 * asks - but it is a record of where the party was, not the address the order
 * lives at.
 *
 * A subcollection of the visit rather than a top-level collection keyed by
 * `visitId`, because every read of an order is a read in the context of one
 * visit: the guest's own, and the staff queue of issue #1105 drawing one table.
 * The one query that would want the other shape - every order in a restaurant
 * tonight - is a collection group query, which this shape still allows.
 *
 * ## The lines are snapshots, not pointers
 *
 * {@link OrderLineSnapshot} carries its own copy of the name, the price, the
 * currency and the variant, and carries {@link OrderLineSnapshot.menuItemId} as
 * well. The reasoning is on that type and is the reason issue #1099 came first.
 * Nothing here reads a price through the menu.
 *
 * ## Immutable except for its status
 *
 * An order is what the guest agreed to. The kitchen moves it along
 * {@link TABLE_ORDER_STATUS_TRANSITIONS} and changes nothing else: a correction
 * is a cancellation with a reason (issue #1105), never a rewrite of the lines,
 * because a bill that can be edited after the fact is a bill nobody can dispute.
 */

/**
 * Every status an order can hold, in the order the lifecycle visits them.
 *
 * A `const` tuple rather than a bare union, following `TABLE_STATUSES` and
 * `TABLE_VISIT_STATUSES`: the backend narrows a stored value at runtime and the
 * staff queue renders a filter over the set, and a union that exists only at
 * compile time can do neither.
 */
export const TABLE_ORDER_STATUSES = [
  /** The guest sent it. The only status this issue ever writes. */
  'submitted',
  /** The restaurant took it. Somebody has read it and agreed to cook it. */
  'accepted',
  /** The kitchen started on it. */
  'preparing',
  /** It reached the table. The ordinary ending. */
  'served',
  /**
   * It will not be cooked.
   *
   * Reachable from every live status rather than from `submitted` alone,
   * because a kitchen that runs out of a dish halfway through preparing it has
   * to be able to say so. What it is not reachable from is `served`: a dish the
   * guest has eaten is not cancellable, and the correction for one that was
   * wrong is a matter for the bill rather than for this field.
   */
  'cancelled',
] as const;

/** The status of one order. */
export type TableOrderStatus = (typeof TABLE_ORDER_STATUSES)[number];

/** The status every order starts in, and the only one this issue writes. */
export const INITIAL_TABLE_ORDER_STATUS: TableOrderStatus = 'submitted';

/**
 * The statuses an order can end in.
 *
 * Ending is one-way, as it is for a visit and a session. A cancelled order is
 * not un-cancelled - the guest who still wants the dish orders it again, which
 * is a new order - and a served one is over.
 */
export const TABLE_ORDER_END_STATUSES: readonly TableOrderStatus[] = [
  'served',
  'cancelled',
];

/**
 * Which statuses each status may move to. A status never lists itself.
 *
 * Declared as data for the reason `TABLE_STATE_TRANSITIONS` is: the backend
 * applies it and the staff queue predicts it by deciding which buttons to
 * offer, and a matrix written twice is a matrix that will disagree - with the
 * disagreement showing up as a button that does nothing.
 *
 * `preparing` is skippable. A restaurant that plates a dessert as it is ordered
 * has no preparing stage worth recording, and forcing one would have staff
 * tapping through a status to reach the one they meant.
 *
 * Nothing leaves `served` or `cancelled`; they are
 * {@link TABLE_ORDER_END_STATUSES}, spelled out here as empty rows so a reader
 * of the matrix does not have to consult a second list to know that.
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

/**
 * The statuses the staff queue of issue #1105 is a list of.
 *
 * Everything that is not an end status, and derived from that list rather than
 * written out beside it: "open" and "not finished with" are one fact, and a
 * second literal would let a sixth status be added to one of them alone.
 *
 * It is a *query* as much as a definition. The queue reads every order of one
 * restaurant whose status is in this set, so the set is what keeps the read
 * bounded - a queue that read every order the restaurant had ever taken would
 * grow without limit and would be re-read in full every time a device opened
 * the screen. An order that is served or cancelled leaves the queue, which is
 * also what the queue means.
 */
export const OPEN_TABLE_ORDER_STATUSES: readonly TableOrderStatus[] =
  TABLE_ORDER_STATUSES.filter(
    (status) => !TABLE_ORDER_END_STATUSES.includes(status),
  );

/** Whether this order is still something the kitchen owes the table. */
export const isTableOrderOpen = (order: Pick<TableOrder, 'status'>): boolean =>
  !isTableOrderEnded(order);

/**
 * The statuses an order currently in `from` may move to.
 *
 * What a UI asks, exactly as `allowedTableStatusTransitions` is for a table:
 * the queue renders one action per returned status, so an order that cannot be
 * accepted twice offers no Accept button rather than a button the backend then
 * refuses. Reading the matrix rather than restating it is what keeps `#1091`'s
 * rule - the matrix is the single definition - true of this surface too.
 */
export const allowedTableOrderStatusTransitions = (
  from: TableOrderStatus,
): readonly TableOrderStatus[] => TABLE_ORDER_STATUS_TRANSITIONS[from];

/** Whether an unknown value is an order status this model knows. */
export const isTableOrderStatus = (value: unknown): value is TableOrderStatus =>
  typeof value === 'string' &&
  (TABLE_ORDER_STATUSES as readonly string[]).includes(value);

/** Whether this order is finished with, for either reason. */
export const isTableOrderEnded = (order: Pick<TableOrder, 'status'>): boolean =>
  TABLE_ORDER_END_STATUSES.includes(order.status);

/** One subcollection per visit, under the restaurant. */
export const TABLE_ORDERS_COLLECTION = 'orders';

/** One order, as one party sent it. */
export interface TableOrder {
  /** Equal to the document id. */
  id: string;
  /** The owning restaurant, repeated from the path so a query can filter it. */
  restaurantId: string;
  /** The visit this order belongs to, which is also the parent document. */
  visitId: string;
  /**
   * Where the party was sitting when they sent it. A plain id, as on the visit.
   *
   * A record rather than an address. A party that moves afterwards keeps this
   * order, and this field keeps naming the table it was ordered from - which is
   * what the kitchen wrote on the ticket.
   */
  tableId: string;
  /** The session that placed it, by `TableSession.id`. */
  sessionId: string;
  /**
   * The account that placed it, anonymous or not.
   *
   * This is the per-line attribution the epic asked for, at the grain that
   * actually exists: a phone. The party shares a visit and a bill, and each
   * order says which phone sent it, so "who ordered the second bottle" is
   * answerable without asking every guest to have an account.
   */
  guestUserId: string;
  status: TableOrderStatus;
  /** The lines, in the order the guest built them. At least one. */
  lines: OrderLineSnapshot[];
  /**
   * The currency every line on this order is priced in, as an ISO 4217 code.
   *
   * Repeated from the lines rather than derived from them, because a total
   * needs one and a line-by-line derivation would have to decide what to do
   * with an order whose lines disagreed. They cannot disagree: the backend
   * refuses an order whose lines are not all in the menu's currency, so this is
   * that one value, recorded once.
   */
  currency: string;
  /**
   * What the order came to, at the moment it was placed.
   *
   * Stored rather than derived, which is the opposite of the choice
   * `OrderLineSnapshot` makes about a line total - and for a reason that only
   * applies here. A line total is arithmetic over two fields of the same
   * document; an order total is what the guest was shown and agreed to send,
   * and the bill of stage 4 sums these. Recording it means a future rounding
   * rule cannot retroactively change a number somebody already saw.
   *
   * Always equal to {@link tableOrderTotal} over {@link lines} at the moment of
   * writing, and the emulator spec asserts it.
   */
  total: number;
  /** When the guest sent it, in epoch milliseconds. */
  submittedAt: number;
  /**
   * When {@link status} last changed, in epoch milliseconds.
   *
   * Equal to {@link submittedAt} on a new order rather than absent, so the
   * staff queue of issue #1105 can sort by "waiting longest" without a
   * coalesce at every call site.
   */
  statusChangedAt: number;
  /**
   * Why the restaurant cancelled it, in the words staff used
   * (GitHub issue #1104).
   *
   * Read here and written by issue #1105, which is the one thing in this model
   * that is the other way round - and deliberately. "Cancellations are
   * explained, not silent" is a guarantee about a *screen*, so the shape it is
   * rendered from belongs with the renderer; the alternative is the staff
   * queue choosing a shape with nothing reading it, which is how a reason ends
   * up recorded in a field no guest is ever shown.
   *
   * Optional, and absent is an ordinary outcome rather than a gap: a kitchen
   * cancelling a dish mid-rush is not always going to type a sentence, and
   * every order cancelled before #1105 lands has none. The screen says the
   * order was cancelled either way and adds the reason where there is one, so
   * the absence costs the guest a detail rather than the fact.
   *
   * Never set on an order that is not `cancelled`. A reason attached to a
   * served dish would be a second, contradictory account of what happened to
   * it.
   */
  cancellationReason?: string;
  /**
   * The staff account that last moved {@link status} (GitHub issue #1105).
   *
   * Absent on an order nobody has moved yet, which is every order in
   * `submitted`: the guest placed it, and `guestUserId` already says who that
   * was. Present from the first staff action onwards, so "who cancelled the
   * main course" is answerable from the order rather than from a separate log.
   *
   * There is no per-transition history the way `tableStateTransitions` is one
   * for a table, and that is a deliberate limit rather than an omission. A
   * table is contended - two hosts seat it in the same second, and the trail is
   * how the argument is settled. An order moves forward through four statuses
   * under one kitchen, and the current status plus who last set it answers
   * every question service actually asks of it.
   */
  statusChangedByUserId?: string;
  /**
   * The idempotency key the phone minted for this submission
   * (GitHub issue #1108).
   *
   * It is also what this document is named after, through
   * {@link tableOrderDocumentId}, which is what makes a replay a read of one
   * document rather than a search for an order that looks similar. The field
   * is written as well as used as the id so the record is readable without
   * consulting document names, exactly as `TableStateTransition.requestId` is.
   *
   * Absent on an order placed by a client that sent no key - every order
   * written before issue #1108, and any future caller that does not need one.
   */
  requestId?: string;
}

/**
 * How an order's idempotency key is spelled, and what it names
 * (GitHub issue #1108).
 *
 * The prefix and the pattern are the same ones issue #1096 chose for a table
 * transition, and for the same two reasons. The key becomes a document id, so
 * it has to be a legal Firestore document name - no slash, no leading dot, no
 * thousand-character string being used as storage. And it has to be one no
 * auto-generated id could ever be, so that a client cannot hand in a
 * twenty-character alphanumeric string that happens to name somebody else's
 * order and be answered with their dinner.
 *
 * Declared here rather than only in the backend because the guest's phone
 * needs it too: an order's document id is derivable from the key, so a phone
 * that sent one can recognise its own order in the list it is already
 * listening to - which is the reconciliation this issue asks for, done by
 * address rather than by guesswork.
 */
export const TABLE_ORDER_REQUEST_ID_PREFIX = 'req-';

/** The shape of a key. Letters, digits, hyphens and underscores, 8 to 128. */
export const TABLE_ORDER_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/** Whether a value is a key both sides would accept. */
export const isTableOrderRequestId = (value: unknown): value is string =>
  typeof value === 'string' && TABLE_ORDER_REQUEST_ID_PATTERN.test(value);

/**
 * The document an order submitted under this key lives at.
 *
 * One function rather than an interpolation at each call site, because the
 * backend writes the name and the phone reads it: two spellings of the same
 * rule would make a landed order invisible to the screen that sent it, which
 * is the exact uncertainty this issue exists to remove.
 */
export const tableOrderDocumentId = (requestId: string): string =>
  `${TABLE_ORDER_REQUEST_ID_PREFIX}${requestId}`;

/**
 * What one order comes to.
 *
 * One function rather than a sum at each call site, because the running total
 * on the guest's phone and the total stored on the order have to be the same
 * number, computed the same way, or the guest agreed to one figure and the
 * restaurant recorded another.
 */
export const tableOrderTotal = (
  lines: readonly Pick<OrderLineSnapshot, 'price' | 'quantity'>[],
): number => lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

/**
 * What a guest has run up over several orders, in one currency
 * (GitHub issue #1104).
 *
 * A second function rather than a `reduce` on the screen, for the reason
 * {@link tableOrderTotal} is one: the running total under a list of orders and
 * the total on each row of it have to agree, and two sums written at two call
 * sites are two chances to disagree in front of somebody about to be charged.
 *
 * **A cancelled order counts for nothing.** It is the only status that changes
 * the arithmetic: a dish that will not be cooked will not be billed, and a
 * total that kept it would tell a guest they owe for the Margherita the kitchen
 * ran out of. Everything else counts from the moment it is sent - a guest who
 * has ordered and not yet been served still owes for it, and a total that waited
 * for `served` would read as zero for the whole first half of a meal.
 *
 * It is not the *bill*. The party shares one (`RD-TS-9`), and this sums one
 * phone's orders because that is what the phone can read (`RD-TS-12`); what the
 * table owes is settled at the table, and is issue #1073's.
 */
export const tableOrdersTotal = (
  orders: readonly Pick<TableOrder, 'status' | 'total'>[],
): number =>
  orders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

/** The largest quantity one line may carry. */
export const MAX_ORDER_LINE_QUANTITY = 99;

/** The most lines one order may carry. */
export const MAX_ORDER_LINES = 60;

/**
 * One line of an order, as the guest's phone sends it.
 *
 * Deliberately not an {@link OrderLineSnapshot}. A snapshot is what the
 * restaurant recorded, and a client that could hand one in would be handing in
 * the name and the price it would like to be charged. So the wire shape carries
 * the decisions the guest made - which dish, which variant, how many, what they
 * asked for - plus {@link SubmitTableOrderLine.price}, which is not a decision
 * but a *claim*, checked against the live menu and never trusted.
 */
export interface SubmitTableOrderLine {
  /** The dish, by `MenuItem.id`. */
  menuItemId: string;
  /** The variant ordered, by its own id. Absent where the dish has none. */
  variantId?: string;
  quantity: number;
  /** What the guest asked for. Absent rather than empty. */
  notes?: string;
  /**
   * The unit price the guest's phone displayed for this line.
   *
   * Sent so the backend can refuse an order whose prices have moved, which is
   * what makes "prices on the submitted order match what the guest saw" a fact
   * rather than a hope. It is never written: the price stored on the line is
   * read off the live menu, and the two being equal is the precondition for
   * writing anything at all.
   */
  price: number;
}

/** What the client sends to place an order. */
export interface SubmitTableOrderRequest {
  restaurantId: string;
  tableId: string;
  /**
   * The currency the guest's phone displayed, checked like the prices.
   *
   * A menu that gained or changed a currency mid-session would otherwise put
   * the same numbers under a different symbol, which is the price problem
   * again with the digits left alone.
   */
  currency: string;
  lines: SubmitTableOrderLine[];
  /**
   * The phone's idempotency key for this submission (GitHub issue #1108).
   *
   * Optional, and the whole of what makes a retry safe. A restaurant's wifi
   * drops answers as readily as it drops requests, so a submission that timed
   * out is, from the phone, indistinguishable from one that never arrived -
   * and the honest response to both is to send it again. Unlabelled, that
   * second send is a second dinner.
   *
   * With a key, the second send finds the order the first one wrote and is
   * answered with it, marked {@link TableOrderSubmitted.replayed}. The key is
   * minted once per *intent* - one cart, one tap - and reused by every attempt,
   * including attempts made after the phone was locked, reloaded or carried out
   * of range and back.
   */
  requestId?: string;
}

/**
 * Why an order was not accepted.
 *
 * A closed list, for the reason `TABLE_SCAN_REFUSAL_REASONS` is one: a guest
 * sitting at a table who is told "something went wrong" puts their phone away,
 * and each of these calls for something different from them - re-read a line,
 * pick something else, call a member of staff, scan again.
 *
 * The three at the end name an item, and that is the acceptance criterion of
 * this issue rather than a nicety: "the Margherita is no longer available" is a
 * sentence the guest can act on and "one of your items is unavailable" is one
 * they have to guess at.
 */
export const TABLE_ORDER_REFUSAL_REASONS = [
  /** The guest has no session at this table. They never scanned, or it is gone. */
  'sessionNotFound',
  /** The session is `pending`, `left` or `closed`. Staff have not opened it. */
  'sessionNotActive',
  /** The session went idle past the restaurant's timeout. */
  'sessionExpired',
  /** The visit ended under the session, between the last read and this one. */
  'visitClosed',
  /** The restaurant has ordering switched off, or paused. */
  'orderingUnavailable',
  /**
   * The table is in a status no order can be placed from.
   *
   * A party is seated (`occupied`) or already ordering. Anything else - a table
   * being cleaned, taken out of service, or merely reserved - means the visit
   * and the floor disagree, and the guest is told to ask rather than having an
   * order recorded against a table nobody is at.
   */
  'tableNotOrderable',
  /** The restaurant's menu has gone, between the scan and the order. */
  'menuMissing',
  /**
   * The menu states no currency, so no line can record what it charged.
   *
   * `Menu.currency` is optional and absent means "not stated" rather than a
   * default, which is right for a menu somebody is only reading (issue #1102)
   * and impossible for one somebody is ordering from: `OrderLineSnapshot`
   * requires a currency, and the only alternative to this refusal is guessing
   * one and printing it on a receipt.
   *
   * Reachable because nothing stops an owner enabling table ordering before
   * setting the currency. The order screen says so before the guest builds a
   * cart; this is the backend declining to take the screen's word for it.
   */
  'menuCurrencyMissing',
  /** The order had no lines, or only lines of zero quantity. */
  'emptyOrder',
  /** An item on the order is no longer on the menu at all. */
  'itemMissing',
  /** An item, or the variant of one, is marked off today. */
  'itemUnavailable',
  /** An item's price has moved since the guest put it in the cart. */
  'priceChanged',
  /** The menu is priced in a different currency from the one the guest saw. */
  'currencyChanged',
] as const;

export type TableOrderRefusalReason =
  (typeof TABLE_ORDER_REFUSAL_REASONS)[number];

/**
 * The item a refusal is about, where it is about one.
 *
 * The name is the *menu's* name rather than one the client sent, because the
 * point of naming it is to tell the guest which row of their cart to look at,
 * and a name supplied by the thing being corrected corrects nothing. An item
 * that has been deleted has no name left to read, so it is absent and the
 * client falls back to the name in its own cart.
 */
export interface TableOrderRefusedItem {
  menuItemId: string;
  variantId?: string;
  /** The item's name on the menu now. Absent when it has been deleted. */
  name?: string;
  /** The price the guest's phone sent. Present on `priceChanged`. */
  shownPrice?: number;
  /** The price on the menu now. Present on `priceChanged`. */
  currentPrice?: number;
}

export interface TableOrderRefused {
  ok: false;
  reason: TableOrderRefusalReason;
  /** Which item, on the four reasons that are about one. */
  item?: TableOrderRefusedItem;
}

export interface TableOrderSubmitted {
  ok: true;
  order: TableOrder;
  /**
   * The table status after the order landed.
   *
   * Returned because the submission may have moved it: a table that was
   * `occupied` is `ordering` once the first order arrives. The guest's screen
   * does not render it, and the emulator spec asserts against it - which is the
   * honest reason it is here, and why it is a status rather than a boolean.
   */
  tableStatus: TableStatus;
  /**
   * True when this answer came from an order that already existed
   * (GitHub issue #1108).
   *
   * The caller is told, because the two are the same outcome and not the same
   * event - the distinction `transitionTableState` draws for the same reason.
   * Here it is also a sentence: a guest whose phone gave up and retried is
   * shown "this was already with the kitchen" rather than a second
   * confirmation of an order they only placed once.
   *
   * Absent on the ordinary path rather than `false`, so a caller reading it is
   * reading a deliberate field.
   */
  replayed?: boolean;
}

/** What `submitTableOrder` answers with. */
export type SubmitTableOrderResult = TableOrderSubmitted | TableOrderRefused;

/** Whether an order was placed, as a type guard. */
export const isTableOrderSubmitted = (
  result: SubmitTableOrderResult,
): result is TableOrderSubmitted => result.ok;

/**
 * The longest cancellation reason staff may record (GitHub issue #1105).
 *
 * A sentence, not a note. The reason exists so a guest reading "cancelled"
 * knows *why* - "the kitchen has run out of sea bass" - and the field is
 * rendered inline under an order row on a phone. A cap here is what stops that
 * row becoming an essay nobody reads, and it is also the only bound on a string
 * a client sends into a document the guest will be shown.
 */
export const MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH = 200;

/**
 * One move along the order lifecycle, as `transitionTableOrderStatus` takes it
 * (GitHub issue #1105).
 *
 * Deliberately the shape `TableTransitionRequest` has for a table, because the
 * two are the same operation on different documents and a staff member meets
 * them on the same screen: name where it should end up, name what you believed
 * it was, and say why where saying why is the point.
 *
 * What it does *not* carry is a `requestId`. A table transition is queued
 * offline and replayed (issue #1096), so its key is minted per intent; an order
 * transition is not queued, because the thing a replayed order transition would
 * protect against - a second identical move - is already refused by
 * {@link expectedStatus}. An order that has moved past `accepted` cannot be
 * accepted again whatever the network did.
 */
export interface TransitionTableOrderRequest {
  restaurantId: string;
  /** The visit the order hangs from, which is the parent of its document. */
  visitId: string;
  orderId: string;
  /** Where the order should end up. */
  status: TableOrderStatus;
  /**
   * The status the caller believes the order holds right now.
   *
   * The same race protection the table has, and needed for the same reason: two
   * members of staff with the queue open both press Accept, or one presses
   * Served while the other cancels. Exactly one commits, and the other is told
   * what the order holds now instead of overwriting it.
   */
  expectedStatus: TableOrderStatus;
  /**
   * Why, in the words staff used. **Required when cancelling** and refused
   * otherwise.
   *
   * Required because "cancellations are explained, not silent" is an acceptance
   * criterion of this issue and a guarantee the guest's screen renders. Refused
   * on every other status because {@link TableOrder.cancellationReason} is the
   * field it lands in, and a reason on a served dish would be a second,
   * contradictory account of what happened to it.
   */
  reason?: string;
}

/** What `transitionTableOrderStatus` answers with when the move was accepted. */
export interface TransitionTableOrderResult {
  restaurantId: string;
  visitId: string;
  orderId: string;
  from: TableOrderStatus;
  to: TableOrderStatus;
  /** The moment the backend says the order entered `to`, in epoch milliseconds. */
  statusChangedAt: number;
}

import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { rolesOf } from '../shared/roles';
import {
  StoredMenuCategory,
  StoredMenuExtra,
  StoredMenuItem,
  backfillMenuIds,
} from '../shared/utils/menu-ids';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
} from './restaurant-authority';
import {
  MENUS_COLLECTION,
  orderingAvailability,
} from './resolve-table-qr-token';
import {
  MAX_ORDER_LINES,
  MAX_ORDER_LINE_QUANTITY,
  INITIAL_TABLE_ORDER_STATUS,
  ORDERABLE_TABLE_STATUSES,
  OrderLineExtraSnapshot,
  OrderLineSnapshot,
  TABLE_ORDERS_COLLECTION,
  TABLE_ORDER_REQUEST_ID_PATTERN,
  TableOrder,
  TableOrderRefused,
  refuseOrder,
  tableOrderDocumentId,
  tableOrderTotal,
} from './table-order';
import {
  TABLE_SESSIONS_COLLECTION,
  isEndedSession,
  isExpiredSession,
  tableOrderingOf,
  tableSessionId,
  tableSessionIdleTimeoutMs,
} from './table-session';
import {
  TABLE_STATES_COLLECTION,
  TABLE_STATE_TRANSITIONS_COLLECTION,
  TableState,
  TableStateTransition,
  TableStatus,
  canTransitionTableStatus,
  tableStatusOf,
  visitIdOf,
} from './table-state';
import { TABLE_VISITS_COLLECTION, isOpenVisit } from './table-visit';

/**
 * The guest sending what they built to the kitchen (GitHub issue #1103).
 *
 * ## Everything the scan checked is checked again, and then some
 *
 * A session was started against a restaurant that was open, taking orders, with
 * a menu on it. Between that and this call sits a meal: the kitchen can pause,
 * the owner can reprice a dish, a member of staff can close the visit, the
 * party can be walked to another table. So the restaurant, the session, the
 * visit, the table and every line are read inside one transaction, and the
 * order lands in the same commit as the table status it moves.
 *
 * ## Why the client sends the prices it displayed
 *
 * The acceptance criterion is that the prices on the order are the prices the
 * guest saw. There are three ways to try to keep it and only one of them works.
 *
 * Snapshotting whatever the menu says now silently recharges a guest whose
 * dish was repriced while they were reading the description of it. Trusting the
 * number the client sends lets a client name its own price. So the client sends
 * what it showed as a *claim*, this compares it to the live menu, and a
 * difference refuses the whole order and names the item and both prices. What
 * is written is always the menu's number - the guest re-reads the line and
 * agrees to the new one, or does not order it.
 *
 * The same argument runs for the currency and for availability, which is why
 * all three refusals name the item rather than saying something went wrong.
 *
 * ## Why the table transition is here and not in `transitionTableState`
 *
 * That callable is guarded by `requireTableStateAuthority`, which admits
 * `staff`, `business` and `admin` and then checks `/restaurantStaff/{uid}`. A
 * guest holds none of those - usually an anonymous account - and widening the
 * guard would hand the floor's state machine to anybody holding a photographed
 * QR code.
 *
 * So the `occupied -> ordering` change is written here, from the same
 * {@link TableState} and {@link TableStateTransition} types, checked against the
 * same {@link canTransitionTableStatus} matrix. The types are the drift
 * protection that matters: a field added to either is a compile error in both
 * places. A shared writer helper would take ten arguments and would have to
 * carry the visit-opening, visit-ending and session-syncing branches that this
 * path can never take - a table going `occupied` to `ordering` opens no visit,
 * ends none, and touches no session but the caller's own.
 *
 * A table that is already `ordering` is left alone and the order still lands.
 * The party ordering a second time has not changed anything about the floor,
 * and treating that as a conflict would refuse every round after the first.
 *
 * ## What it writes
 *
 * ```text
 * /restaurants/{id}/visits/{visitId}/orders/{orderId}     created
 * /restaurants/{id}/tableSessions/{sessionId}             lastActiveAt touched
 * /restaurants/{id}/tableStates/{tableId}                 replaced, when moving
 * /restaurants/{id}/tableStateTransitions/{transitionId}  appended, when moving
 * ```
 *
 * ## Sending the same order twice (GitHub issue #1108)
 *
 * A restaurant's wifi drops answers as readily as it drops requests, so a
 * submission that timed out is, from the phone, indistinguishable from one that
 * never arrived. The honest response to both is to send it again, and
 * unlabelled that second send is a second dinner.
 *
 * So the phone mints a key once per *intent* - one cart, one tap - and every
 * attempt carries it. The key names the order document, which turns the dedupe
 * into a read of one document rather than a search for an order that looks
 * similar: the replay reads the id it would write, and two copies of one
 * request racing each other contend on it because the read is inside the
 * transaction.
 *
 * The replay is answered **before** the session status, the visit, the table
 * and the menu are checked, and deliberately. A replay arrives after the world
 * has moved on - the kitchen may have paused, the party may have been moved,
 * the dish may have sold out - and none of that makes the order that already
 * landed untrue. What it must not do is land twice.
 */

/** One extra ticked on a line (GitHub issue #1598). Parsed, never trusted. */
export interface SubmitTableOrderExtra {
  extraId?: unknown;
  /** The price the phone displayed for it. A claim, like the line's. */
  price?: unknown;
}

/** One line, as the guest's phone sends it. Parsed, never trusted. */
export interface SubmitTableOrderLine {
  menuItemId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
  notes?: unknown;
  /** The unit price the phone displayed. A claim, checked against the menu. */
  price?: unknown;
  /** The extras ticked on this line (GitHub issue #1598). */
  extras?: unknown;
}

export interface SubmitTableOrderRequest {
  restaurantId?: unknown;
  /** The table the guest scanned, which names their session document. */
  tableId?: unknown;
  /** The currency the phone displayed, checked like the prices. */
  currency?: unknown;
  lines?: unknown;
  /**
   * The phone's idempotency key for this submission (GitHub issue #1108).
   *
   * Optional, so every client written before that issue goes on working, and
   * the whole of what makes a retry safe for the ones that send it. Minted once
   * per intent and reused by every attempt, including attempts made after the
   * phone was locked, reloaded or carried out of range and back.
   */
  requestId?: unknown;
}

export interface TableOrderSubmitted {
  ok: true;
  order: TableOrder;
  /** What the table is once the order landed. `ordering`, on every path. */
  tableStatus: TableStatus;
  /**
   * True when the order already existed under this key (GitHub issue #1108).
   *
   * Absent on the ordinary path rather than `false`, so a caller reading it is
   * reading a deliberate field. The guest's screen renders it as a different
   * sentence: an order that was already with the kitchen is not a second
   * confirmation of one they placed once.
   */
  replayed?: boolean;
}

export type SubmitTableOrderResult = TableOrderSubmitted | TableOrderRefused;

/** An extra after parsing, before it has been checked against the menu. */
interface RequestedExtra {
  extraId: string;
  shownPrice: number;
}

/** A line after parsing, before anything has been checked against the menu. */
interface RequestedLine {
  menuItemId: string;
  variantId: string;
  quantity: number;
  notes: string;
  shownPrice: number;
  extras: RequestedExtra[];
}

/**
 * The most extras one line may carry (GitHub issue #1598).
 *
 * A bound on a list a client sends rather than a product rule: a category
 * offering more than this is a menu nobody could read on a phone, and without
 * a cap a single line could ask the transaction to check an unbounded list.
 */
const MAX_LINE_EXTRAS = 20;

/** The free-text note on a line, capped so it cannot be used as storage. */
const MAX_NOTES_LENGTH = 280;

/**
 * The caller's uid, and nothing else about them.
 *
 * There is no `guestUserId` argument and there must not be one, for the reason
 * `leaveTableSession` gives: the session's document name is derived from the
 * uid, so a caller can only ever address its own. An anonymous account is
 * enough, and is what most guests have.
 */
const guestUidOf = (request: CallableRequest<unknown>): string => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to order at a table.');
  }

  return request.auth.uid;
};

/**
 * An optional id argument, as a string.
 *
 * Absent and empty are the same answer - a dish with no variant selected - so
 * both produce `''` rather than a value a later comparison has to special-case.
 */
const parseOptionalId = (value: unknown, field: string): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${field} must be an id.`);
  }

  return value.trim();
};

/**
 * The caller's idempotency key, or `''` when it sent none
 * (GitHub issue #1108).
 *
 * The shape is deliberately narrow rather than "any string", for the reason
 * `transitionTableState` gives: the key becomes a document name, so a slash
 * would address a subcollection, a leading `.` is refused by Firestore, and a
 * thousand-character key is a way to store data in a document id.
 */
const parseRequestId = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (
    typeof value !== 'string' ||
    !TABLE_ORDER_REQUEST_ID_PATTERN.test(value)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'requestId must be 8 to 128 characters of letters, digits, hyphens or underscores.',
    );
  }

  return value;
};

const parseNotes = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'notes must be text.');
  }

  const notes = value.trim();

  if (notes.length > MAX_NOTES_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
    );
  }

  return notes;
};

/**
 * The quantity on one line.
 *
 * Whole and at least one. A fractional quantity is a client bug and a quantity
 * of zero is a line the guest removed and the client forgot to drop; both are
 * refused rather than rounded or skipped, because an order that silently loses
 * a line is worse than one that does not send.
 */
const parseQuantity = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_ORDER_LINE_QUANTITY
  ) {
    throw new HttpsError(
      'invalid-argument',
      `quantity must be a whole number between 1 and ${MAX_ORDER_LINE_QUANTITY}.`,
    );
  }

  return value;
};

/**
 * The price the phone displayed.
 *
 * Validated for shape only. Whether it is the *right* number is the menu's
 * question, asked inside the transaction, and answering it here against
 * anything would be answering it against a stale read.
 */
const parseShownPrice = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new HttpsError('invalid-argument', 'price must be a number.');
  }

  return value;
};

/**
 * The extras ticked on one line (GitHub issue #1598).
 *
 * A duplicate is an `invalid-argument` rather than a refusal, and the
 * distinction is the one the rest of this file draws: a refusal is something
 * the guest can act on - the dish sold out, the price moved - and is rendered
 * as a sentence they read. An extra is a tick box, so one named twice is not a
 * decision any screen can produce; it is a client bug, and dressing it up as a
 * refusal would put a sentence in front of a guest that tells them to fix
 * something they never did.
 *
 * Which extras exist, and at what price, is the menu's question and is asked
 * inside the transaction.
 */
const parseExtras = (value: unknown): RequestedExtra[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'extras must be a list.');
  }

  if (value.length > MAX_LINE_EXTRAS) {
    throw new HttpsError(
      'invalid-argument',
      `A line carries at most ${MAX_LINE_EXTRAS} extras.`,
    );
  }

  const extras = value.map((entry) => {
    const extra = (entry ?? {}) as SubmitTableOrderExtra;

    return {
      extraId: parseRequiredString(extra.extraId, 'extraId'),
      shownPrice: parseShownPrice(extra.price),
    };
  });

  if (new Set(extras.map((extra) => extra.extraId)).size !== extras.length) {
    throw new HttpsError(
      'invalid-argument',
      'extras must not name the same extra twice.',
    );
  }

  return extras;
};

const parseLines = (value: unknown): RequestedLine[] => {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'lines must be a list.');
  }

  if (value.length > MAX_ORDER_LINES) {
    throw new HttpsError(
      'invalid-argument',
      `An order carries at most ${MAX_ORDER_LINES} lines.`,
    );
  }

  return value.map((entry) => {
    const line = (entry ?? {}) as SubmitTableOrderLine;

    return {
      menuItemId: parseRequiredString(line.menuItemId, 'menuItemId'),
      variantId: parseOptionalId(line.variantId, 'variantId'),
      quantity: parseQuantity(line.quantity),
      notes: parseNotes(line.notes),
      shownPrice: parseShownPrice(line.price),
      extras: parseExtras(line.extras),
    };
  });
};

/** A stored menu item's price, or `undefined` where it has none to read. */
const priceOf = (item: StoredMenuItem): number | undefined =>
  typeof item['price'] === 'number' ? (item['price'] as number) : undefined;

const nameOf = (item: StoredMenuItem): string =>
  typeof item['name'] === 'string' ? (item['name'] as string) : '';

/** Whether the kitchen is serving this today, reading absent as available. */
const isAvailable = (item: StoredMenuItem): boolean =>
  item['isAvailable'] !== false;

/**
 * The dish one id names, and the category it is printed in.
 *
 * Top-level items only. A variant is reached through the dish it belongs to,
 * which is what makes "this variant is a variant of that dish" a fact the order
 * establishes rather than one it assumes: a client naming the large Margherita
 * as a variant of the tiramisu finds nothing here.
 *
 * The category comes back with it because a dish's extras are its category's
 * (GitHub issue #1598, and `menuExtrasForItem` in the library). Answering both
 * from one walk is what makes "this extra is offered with that dish" the same
 * kind of established fact: an extra named from another section finds nothing.
 */
const findDish = (
  categories: StoredMenuCategory[],
  menuItemId: string,
): { dish: StoredMenuItem; category: StoredMenuCategory } | undefined => {
  for (const category of categories) {
    const dish = (category.items ?? []).find((item) => item.id === menuItemId);

    if (dish) {
      return { dish, category };
    }
  }

  return undefined;
};

/** A stored extra's price, or `undefined` where it has none to read. */
const extraPriceOf = (extra: StoredMenuExtra): number | undefined =>
  typeof extra['price'] === 'number' ? (extra['price'] as number) : undefined;

/** The extras a category offers, which are the extras each of its dishes has. */
const extrasOf = (category: StoredMenuCategory): StoredMenuExtra[] =>
  category.extrasBlock?.extras ?? [];

/**
 * One line checked against the live menu, or the refusal it earned.
 *
 * The order of the checks is the order the guest would ask them in: is it still
 * on the menu, is it being served, is it the price I was shown, is it in the
 * currency I was shown. An item that is both gone and repriced is reported as
 * gone, because that is the sentence that tells the guest what to do.
 */
const checkLine = (
  line: RequestedLine,
  categories: StoredMenuCategory[],
  currency: string,
): OrderLineSnapshot | TableOrderRefused => {
  const found = findDish(categories, line.menuItemId);

  if (!found) {
    return refuseOrder('itemMissing', { menuItemId: line.menuItemId });
  }

  const { dish, category } = found;

  const variant = line.variantId
    ? (dish.variants ?? []).find((entry) => entry.id === line.variantId)
    : undefined;

  if (line.variantId && !variant) {
    return refuseOrder('itemMissing', {
      menuItemId: line.menuItemId,
      variantId: line.variantId,
      name: nameOf(dish),
    });
  }

  const named = {
    menuItemId: line.menuItemId,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    name: nameOf(dish),
  };

  // Unavailability travels down and availability does not travel up, matching
  // `isMenuVariantAvailable`: an owner who takes a dish off the menu has said
  // the dish is off, and its sizes are sizes of that dish.
  if (!isAvailable(dish) || (variant && !isAvailable(variant))) {
    return refuseOrder('itemUnavailable', named);
  }

  const price = priceOf(variant ?? dish);

  if (price === undefined || price !== line.shownPrice) {
    return refuseOrder('priceChanged', {
      ...named,
      shownPrice: line.shownPrice,
      ...(price === undefined ? {} : { currentPrice: price }),
    });
  }

  // The extras, on exactly the terms of the dish above them (issue #1598):
  // is it still offered with this dish, and is it the price I was shown. The
  // order of the two is the same, and for the same reason - an extra that is
  // both gone and repriced is reported as gone, because that is the sentence
  // that tells the guest what to do about it.
  const offered = extrasOf(category);
  const extras: OrderLineExtraSnapshot[] = [];

  for (const ticked of line.extras) {
    const extra = offered.find((entry) => entry.id === ticked.extraId);

    if (!extra) {
      return refuseOrder('extraMissing', {
        ...named,
        extraId: ticked.extraId,
      });
    }

    const extraPrice = extraPriceOf(extra);

    if (extraPrice === undefined || extraPrice !== ticked.shownPrice) {
      return refuseOrder('extraPriceChanged', {
        ...named,
        extraId: ticked.extraId,
        extraName: nameOf(extra),
        shownPrice: ticked.shownPrice,
        ...(extraPrice === undefined ? {} : { currentPrice: extraPrice }),
      });
    }

    extras.push({
      extraId: ticked.extraId,
      name: nameOf(extra),
      price: extraPrice,
    });
  }

  return {
    menuItemId: line.menuItemId,
    name: nameOf(dish),
    ...(variant
      ? { variantId: line.variantId, variantName: nameOf(variant) }
      : {}),
    price,
    currency,
    quantity: line.quantity,
    ...(line.notes ? { notes: line.notes } : {}),
    ...(extras.length ? { extras } : {}),
  };
};

/** Whether a checked line came back as a refusal rather than a snapshot. */
const isRefusal = (
  checked: OrderLineSnapshot | TableOrderRefused,
): checked is TableOrderRefused => 'ok' in checked;

/**
 * The status a landed order leaves the table in.
 *
 * One constant rather than two literals, because the replay of issue #1108
 * answers with it without re-reading the floor: a submission that landed made
 * the table `ordering`, and that is what this answer describes - what that
 * submission did, not what the table holds an hour later.
 */
const ORDERED_TABLE_STATUS: TableStatus = 'ordering';

/**
 * The answer to an order that already landed (GitHub issue #1108).
 *
 * Built from the stored order rather than from anything read now, which is the
 * shape `replayedResult` takes in `transitionTableState` and for the same
 * reason: the record of *this* submission is the order it wrote, and nothing
 * the restaurant has done since changes what the guest sent.
 *
 * Nothing is written. That is the point - the order, the session touch and the
 * table move were all written by the first attempt, in one commit, and the
 * second attempt is a question rather than an action.
 */
const replayedOrder = (
  stored: DocumentData,
  id: string,
): TableOrderSubmitted => ({
  ok: true,
  order: { ...(stored as TableOrder), id },
  tableStatus: ORDERED_TABLE_STATUS,
  replayed: true,
});

/** The currency a menu states its prices in, normalised. */
const menuCurrencyOf = (menu: DocumentData): string =>
  typeof menu['currency'] === 'string' ? menu['currency'].trim() : '';

export const submitTableOrderHandler = async (
  request: CallableRequest<SubmitTableOrderRequest>,
  now: Date = new Date(),
): Promise<SubmitTableOrderResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const scannedTableId = parseRequiredString(request.data?.tableId, 'tableId');
  const shownCurrency = parseRequiredString(request.data?.currency, 'currency');
  const lines = parseLines(request.data?.lines);
  const requestId = parseRequestId(request.data?.requestId);
  const guestUserId = guestUidOf(request);

  if (!lines.length) {
    return refuseOrder('emptyOrder');
  }

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const sessionRef = restaurantRef
    .collection(TABLE_SESSIONS_COLLECTION)
    .doc(tableSessionId(scannedTableId, guestUserId));
  const at = now.getTime();

  return firestore.runTransaction(async (transaction) => {
    const [restaurantSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(restaurantRef),
      transaction.get(sessionRef),
    ]);

    if (!sessionSnapshot.exists) {
      return refuseOrder('sessionNotFound');
    }

    // A restaurant deleted mid-meal leaves its subcollections behind, so the
    // session can outlive it. There is no branch for that here on purpose: an
    // absent document has no `tableOrdering`, so the availability check below
    // answers `orderingUnavailable`, which is the true sentence - this
    // restaurant is not taking orders - rather than a second one about a
    // deletion the guest cannot act on.
    const restaurant = restaurantSnapshot.data() ?? {};

    const session = sessionSnapshot.data();

    // Read off the session before anything is checked, because the replay
    // below needs the visit the order would live under - and a replay must not
    // be refused for the state of a meal it already happened in.
    const visitId =
      typeof session?.['visitId'] === 'string' ? session['visitId'] : '';
    const orders = restaurantRef
      .collection(TABLE_VISITS_COLLECTION)
      .doc(visitId || scannedTableId)
      .collection(TABLE_ORDERS_COLLECTION);
    const orderRef = requestId
      ? orders.doc(tableOrderDocumentId(requestId))
      : orders.doc();

    // Inside the transaction rather than before it, so two copies of one
    // request arriving together contend on this document: the loser's read set
    // is touched by the winner's `create`, Firestore retries it, and the retry
    // finds the order and answers with it (GitHub issue #1108).
    //
    // A session with no visit has nothing to have ordered into, so there is
    // nothing to read - the placeholder path above exists only so a reference
    // can be built, and `visitClosed` below is what such a session is told.
    const alreadyPlaced =
      requestId && visitId ? await transaction.get(orderRef) : undefined;

    if (alreadyPlaced?.exists) {
      return replayedOrder(alreadyPlaced.data() ?? {}, alreadyPlaced.id);
    }

    const idleTimeoutMs = tableSessionIdleTimeoutMs(
      tableOrderingOf(restaurant)['sessionIdleTimeoutMinutes'],
    );

    if (isEndedSession(session)) {
      return refuseOrder('sessionNotActive');
    }

    // Persisted rather than merely reported, following the rest of the session
    // design: expiry is observed at the moment somebody asks, and a document
    // read after it expired must stop reading as live to anything that only
    // knows the status.
    if (isExpiredSession(session, idleTimeoutMs, at)) {
      transaction.update(sessionRef, { status: 'expired', endedAt: at });

      return refuseOrder('sessionExpired');
    }

    if (session?.['status'] !== 'active') {
      return refuseOrder('sessionNotActive');
    }

    const ordering = orderingAvailability(tableOrderingOf(restaurant), now);

    if (!ordering.available) {
      return refuseOrder('orderingUnavailable');
    }

    if (!visitId) {
      // An active session with no visit should not exist - the commit that
      // activates one writes the pointer. If one ever does, there is nothing to
      // order into, which is what the guest is told.
      return refuseOrder('visitClosed');
    }

    const visitRef = restaurantRef
      .collection(TABLE_VISITS_COLLECTION)
      .doc(visitId);
    const visitSnapshot = await transaction.get(visitRef);

    if (!isOpenVisit(visitSnapshot.data())) {
      return refuseOrder('visitClosed');
    }

    // The visit's table and not the session's. A party walked to a bigger table
    // by `moveTableVisit` keeps its visit and its session, and the session goes
    // on naming the table the guest scanned - so the order would otherwise be
    // recorded against a table the party left, and the status advance would
    // move a table nobody is sitting at.
    const tableId =
      typeof visitSnapshot.data()?.['tableId'] === 'string'
        ? (visitSnapshot.data()?.['tableId'] as string)
        : scannedTableId;

    const menuId =
      typeof restaurant['menuId'] === 'string' ? restaurant['menuId'] : '';

    if (!menuId) {
      return refuseOrder('menuMissing');
    }

    const [menuSnapshot, stateSnapshot] = await Promise.all([
      transaction.get(firestore.collection(MENUS_COLLECTION).doc(menuId)),
      transaction.get(
        restaurantRef.collection(TABLE_STATES_COLLECTION).doc(tableId),
      ),
    ]);

    if (!menuSnapshot.exists) {
      return refuseOrder('menuMissing');
    }

    const menu = menuSnapshot.data() ?? {};
    const currency = menuCurrencyOf(menu);

    if (!currency) {
      return refuseOrder('menuCurrencyMissing');
    }

    if (currency !== shownCurrency) {
      return refuseOrder('currencyChanged');
    }

    const from = tableStatusOf(stateSnapshot.data());

    if (!ORDERABLE_TABLE_STATUSES.includes(from)) {
      return refuseOrder('tableNotOrderable');
    }

    // The state's own pointer, checked against the one the session followed. A
    // table whose visit has been replaced under an active session is a floor
    // and a visit that disagree, and an order recorded against either is
    // recorded against the wrong party.
    if (visitIdOf(stateSnapshot.data()) !== visitId) {
      return refuseOrder('visitClosed');
    }

    // Run through the menu once it is known to be readable and priced. The
    // whole order is refused on the first line that fails: a partial order is
    // one the guest did not place, and sending three of the four dishes a table
    // asked for is worse than sending none and saying why.
    const checked = backfillMenuIds(
      menu['categories'] as StoredMenuCategory[] | undefined,
    ).categories;
    const snapshots: OrderLineSnapshot[] = [];

    for (const line of lines) {
      const result = checkLine(line, checked, currency);

      if (isRefusal(result)) {
        return result;
      }

      snapshots.push(result);
    }

    const order: TableOrder = {
      id: orderRef.id,
      restaurantId,
      visitId,
      tableId,
      sessionId: sessionRef.id,
      guestUserId,
      status: INITIAL_TABLE_ORDER_STATUS,
      lines: snapshots,
      currency,
      total: tableOrderTotal(snapshots),
      submittedAt: at,
      statusChangedAt: at,
      ...(requestId ? { requestId } : {}),
    };

    transaction.create(orderRef, order);

    // Ordering is activity. Without this a party three hours into a long dinner
    // that is still ordering would go idle on the clock that measures whether
    // anybody is still there.
    transaction.update(sessionRef, { lastActiveAt: at });

    const to: TableStatus = ORDERED_TABLE_STATUS;

    if (from !== to) {
      // Checked against the same matrix the staff callable uses rather than
      // asserted, so a matrix edit that stops allowing this reaches here too.
      if (!canTransitionTableStatus(from, to)) {
        return refuseOrder('tableNotOrderable');
      }

      const nextState: TableState = {
        tableId,
        restaurantId,
        status: to,
        since: at,
        updatedByUserId: guestUserId,
        visitId,
      };

      // No `reason`. The field is free text a staff screen renders raw, so an
      // English sentence written here would appear untranslated on a German
      // restaurant's floor; what links this entry to the order is the `visitId`
      // it carries and the order sitting under that visit.
      const entry: TableStateTransition = {
        tableId,
        restaurantId,
        from,
        to,
        actorUserId: guestUserId,
        actorRoles: rolesOf(request),
        at,
        atIso: new Date(at).toISOString(),
        visitId,
      };

      transaction.set(
        restaurantRef.collection(TABLE_STATES_COLLECTION).doc(tableId),
        nextState,
      );
      transaction.create(
        restaurantRef.collection(TABLE_STATE_TRANSITIONS_COLLECTION).doc(),
        entry,
      );
    }

    return { ok: true, order, tableStatus: to };
  });
};

/**
 * Classified `authenticated` in `callable-authorization.spec.ts`, and the third
 * callable for which an *anonymous* session is enough.
 *
 * The same door `startTableSession` and `leaveTableSession` open, onto a room
 * one document wider. The caller cannot choose the restaurant, the table, the
 * visit or the prices: the session it addresses is named after its own uid, the
 * visit comes off that session, the table comes off that visit, and every
 * number comes off the restaurant's own menu.
 */
export const submitTableOrder = onAppCheck<SubmitTableOrderRequest>((request) =>
  submitTableOrderHandler(request),
);

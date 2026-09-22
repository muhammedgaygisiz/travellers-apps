import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
} from './restaurant-authority';
import { TABLE_ORDERS_COLLECTION } from './table-order';
import {
  TABLE_SESSIONS_COLLECTION,
  isEndedSession,
  isExpiredSession,
  tableOrderingOf,
  tableSessionId,
  tableSessionIdleTimeoutMs,
} from './table-session';
import { TABLE_VISITS_COLLECTION, isOpenVisit } from './table-visit';
import {
  ReadTableVisitBillResult,
  TableVisitBillLine,
  refuseBill,
  tableVisitBillLines,
  tableVisitBillTotal,
} from './table-visit-bill';

/**
 * What the table owes, read by a guest sitting at it (GitHub issue #1110).
 *
 * ## What it reads, and writes
 *
 * ```text
 * /restaurants/{id}/tableSessions/{sessionId}          read, and expired on read
 * /restaurants/{id}/visits/{visitId}                   read
 * /restaurants/{id}/visits/{visitId}/orders            read whole
 * ```
 *
 * The one write is the same one every other guest callable makes: a session
 * found idle past the restaurant's timeout is persisted as `expired` by
 * whichever caller observes it, because expiry is a predicate rather than a
 * swept job (`RD-TS-5`).
 *
 * ## Why a callable rather than a rule
 *
 * `RD-TS-12` gives the guest's phone the orders **their own uid** sent, and
 * Firestore admits that `list` only because the query names the caller - so
 * the `where` is the permission. A visit-scoped query has nothing equivalent:
 * the session document that proves membership is named after the table the
 * guest *scanned*, and the visit names the table the party is at *now*, so a
 * moved party would have the derivation miss. Recording every guest on the
 * visit to close that gap was refused as a second copy of what the sessions
 * already say.
 *
 * This checks the membership directly instead, in one transaction, and
 * `firestore.rules` is untouched. A guest's phone still cannot `list` the
 * visit, and the bill it is handed carries no `guestUserId` anywhere
 * (`RD-TS-47`).
 *
 * ## What it refuses
 *
 * The party test `requestTableAssistance` applies, with the same four reasons
 * and the same words: an active session, not idle, naming a visit that is
 * still open. A `pending` guest has been seated by nobody and owes nothing
 * yet; a closed visit is issue #1111's retained summary rather than a live
 * bill, and this callable deliberately stops at the moment the visit ends.
 *
 * ## What it does not check
 *
 * `orderingAvailability`, for the reason the assistance callable gives: a
 * kitchen that has shut has nothing to do with whether the party in the dining
 * room may see what they owe, and after service is exactly when they ask.
 */

export interface ReadTableVisitBillRequest {
  restaurantId?: unknown;
  /** The table the guest scanned, which names their session document. */
  tableId?: unknown;
}

/**
 * The caller's uid, and nothing else about them.
 *
 * No `guestUserId` argument, for the reason `requestTableAssistance` gives:
 * the session's name is derived from the uid, so a caller can only address its
 * own. An anonymous account is enough and is what most guests hold.
 */
const guestUidOf = (request: CallableRequest<unknown>): string => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to see the bill.');
  }

  return request.auth.uid;
};

export const readTableVisitBillHandler = async (
  request: CallableRequest<ReadTableVisitBillRequest>,
  now: Date = new Date(),
): Promise<ReadTableVisitBillResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const scannedTableId = parseRequiredString(request.data?.tableId, 'tableId');
  const guestUserId = guestUidOf(request);

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
      return refuseBill('sessionNotFound');
    }

    const restaurant = restaurantSnapshot.data() ?? {};
    const session = sessionSnapshot.data();
    const idleTimeoutMs = tableSessionIdleTimeoutMs(
      tableOrderingOf(restaurant)['sessionIdleTimeoutMinutes'],
    );

    if (isEndedSession(session)) {
      return refuseBill('sessionNotActive');
    }

    if (isExpiredSession(session, idleTimeoutMs, at)) {
      transaction.update(sessionRef, { status: 'expired', endedAt: at });

      return refuseBill('sessionExpired');
    }

    if (session?.['status'] !== 'active') {
      return refuseBill('sessionNotActive');
    }

    const visitId =
      typeof session?.['visitId'] === 'string' ? session['visitId'] : '';

    if (!visitId) {
      return refuseBill('visitClosed');
    }

    const visitRef = restaurantRef
      .collection(TABLE_VISITS_COLLECTION)
      .doc(visitId);
    const visitSnapshot = await transaction.get(visitRef);
    const visit = visitSnapshot.data();

    if (!isOpenVisit(visit)) {
      return refuseBill('visitClosed');
    }

    // The whole subcollection, not a query: an open visit's orders are bounded
    // by what one party can eat, and a `where` on the status would need an
    // index for a read that is already small. Cancelled orders are dropped
    // here for the reason `tableOrdersTotal` drops them - a dish the kitchen
    // will not cook will not be billed.
    const orderSnapshot = await transaction.get(
      visitRef.collection(TABLE_ORDERS_COLLECTION),
    );
    const orders = orderSnapshot.docs
      .map((document) => document.data())
      .filter((order) => order['status'] !== 'cancelled');

    const lines: TableVisitBillLine[] = tableVisitBillLines(orders);

    // Read off the orders rather than off the restaurant: the currency on a
    // line is what the guest was shown when they ordered (`OrderLineSnapshot`),
    // and a restaurant that repriced into another currency mid-service must
    // not restate what the party already agreed to. Every order carries one,
    // equal on every line, so the first is the bill's.
    const currency =
      orders
        .map((order) => order['currency'])
        .find((value): value is string => typeof value === 'string') ?? '';

    return {
      ok: true,
      bill: {
        restaurantId,
        visitId,
        // The visit's table and not the scanned one, for the reason the
        // assistance callable reads the same field: a party that was walked to
        // another table is sitting where the visit says.
        tableId:
          typeof visit?.['tableId'] === 'string'
            ? (visit['tableId'] as string)
            : scannedTableId,
        currency,
        lines,
        total: tableVisitBillTotal(lines),
        paymentStatus:
          visit?.['paymentStatus'] === 'settled' ? 'settled' : 'unsettled',
        ...(typeof visit?.['settlementMethod'] === 'string'
          ? { settlementMethod: visit['settlementMethod'] }
          : {}),
        orderCount: orders.length,
      },
    } as ReadTableVisitBillResult;
  });
};

export const readTableVisitBill = onAppCheck<
  ReadTableVisitBillRequest,
  Promise<ReadTableVisitBillResult>
>((request) => readTableVisitBillHandler(request));

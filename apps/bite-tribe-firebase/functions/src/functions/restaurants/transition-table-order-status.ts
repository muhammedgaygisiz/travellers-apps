import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
  requireTableStateAuthority,
} from './restaurant-authority';
import {
  MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH,
  TABLE_ORDERS_COLLECTION,
  TableOrderStatus,
  canTransitionTableOrderStatus,
  isTableOrderStatus,
  orderStatusOf,
} from './table-order';
import { TABLE_VISITS_COLLECTION } from './table-visit';

/**
 * The one writer of an order's status (GitHub issue #1105).
 *
 * ## Why a callable and not a client write
 *
 * The same answer `transitionTableState` gives, arrived at from the other side
 * of the pass. `firestore.rules` refuses every client write to `orders`, and it
 * has to: a guest able to write there could mark their own dinner served, and a
 * member of staff able to write there could rewrite the lines of an order after
 * the guest agreed to them - which is a bill nobody can dispute. So the status
 * moves here, and nothing else on the document moves at all.
 *
 * ## Why it is a transaction against `expectedStatus`
 *
 * Because two people work one queue. A waiter presses Served on the tablet at
 * the pass while the kitchen presses Cancelled on the one by the grill, and
 * without the expectation the later write wins silently - the guest is billed
 * for a dish nobody cooked, or is not billed for one they ate. With it exactly
 * one commits and the other is told what the order holds now, which is a
 * sentence the queue can put on screen beside the row that did not move.
 *
 * This is deliberately *not* the idempotency key of issue #1096. A table
 * transition is queued offline and replayed, so it needs a name for the intent;
 * an order transition is sent while somebody is standing at the pass looking at
 * the screen, and a replay of it is refused by the expectation anyway - an
 * order already `accepted` cannot be accepted again.
 *
 * ## What one transition writes
 *
 * One document, four fields: the status, the moment it changed, who changed it,
 * and - on a cancellation and nowhere else - why. The lines, the prices, the
 * total, the visit and the table are what the guest agreed to and are never
 * touched. That is the whole of "immutable except for its status" from the
 * model, enforced here rather than promised.
 */

/** One move along the order lifecycle, as the staff queue sends it. */
export interface TransitionTableOrderRequest {
  restaurantId: string;
  visitId: string;
  orderId: string;
  status: TableOrderStatus;
  expectedStatus: TableOrderStatus;
  reason?: string;
}

/** What the callable answers with when the move was accepted. */
export interface TransitionTableOrderResult {
  restaurantId: string;
  visitId: string;
  orderId: string;
  from: TableOrderStatus;
  to: TableOrderStatus;
  statusChangedAt: number;
}

/** A required order status argument, or an `invalid-argument` failure. */
const parseOrderStatus = (value: unknown, field: string): TableOrderStatus => {
  if (!isTableOrderStatus(value)) {
    throw new HttpsError(
      'invalid-argument',
      `${field} is not an order status.`,
    );
  }

  return value;
};

/**
 * The cancellation reason, checked against the status it is attached to.
 *
 * Two rules and two different failures, because they are two different
 * mistakes. A cancellation without a reason is the queue failing to ask, and
 * "cancellations are explained, not silent" is an acceptance criterion of this
 * issue rather than a nicety - a guest whose main course vanishes with no
 * sentence beside it has been told less than nothing. A reason on any other
 * status is a caller writing a field that will sit permanently on a served dish
 * contradicting the fact that it was served.
 *
 * The cap is the model's, so a sentence the queue would refuse to send is a
 * sentence this side refuses to store. Trimmed first, so a reason of spaces is
 * the absence it actually is rather than a reason of length four.
 */
const parseCancellationReason = (
  value: unknown,
  status: TableOrderStatus,
): string | undefined => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (status !== 'cancelled') {
    if (reason) {
      throw new HttpsError(
        'invalid-argument',
        'A reason may only be given when cancelling an order.',
      );
    }

    return undefined;
  }

  if (!reason) {
    throw new HttpsError(
      'invalid-argument',
      'A cancellation needs a reason the guest can be shown.',
    );
  }

  if (reason.length > MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `A cancellation reason may be at most ${MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH} characters.`,
    );
  }

  return reason;
};

export const transitionTableOrderStatusHandler = async (
  request: CallableRequest<TransitionTableOrderRequest>,
): Promise<TransitionTableOrderResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const visitId = parseRequiredString(request.data?.visitId, 'visitId');
  const orderId = parseRequiredString(request.data?.orderId, 'orderId');
  const to = parseOrderStatus(request.data?.status, 'status');
  const expected = parseOrderStatus(
    request.data?.expectedStatus,
    'expectedStatus',
  );
  const reason = parseCancellationReason(request.data?.reason, to);

  // The same authority a table transition needs, and deliberately the same
  // function: operating a restaurant during service is one permission, and a
  // second list of who may work the pass would be free to disagree with who may
  // seat a table. Staff reach it through their own association, never through
  // the `staff` role alone.
  const actingUid = await requireTableStateAuthority(request, restaurantId);

  const orderRef = getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLE_VISITS_COLLECTION)
    .doc(visitId)
    .collection(TABLE_ORDERS_COLLECTION)
    .doc(orderId);

  return getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Order was not found.');
    }

    const from = orderStatusOf(snapshot.data());

    if (!from) {
      // A stored status this backend does not know. Refusing rather than
      // guessing: the alternative is applying the matrix from a row that does
      // not exist, which would throw somewhere less explicable.
      throw new HttpsError(
        'failed-precondition',
        'This order holds a status this version does not know.',
      );
    }

    if (from !== expected) {
      throw new HttpsError(
        'aborted',
        `The order is ${from} now, not ${expected}. Someone else changed it first.`,
        { status: from },
      );
    }

    if (!canTransitionTableOrderStatus(from, to)) {
      throw new HttpsError(
        'failed-precondition',
        `An order cannot move from ${from} to ${to}.`,
      );
    }

    const statusChangedAt = Date.now();

    // An update rather than a set: the lines, the prices, the total, the
    // visit and the guest are what the order *is*, and a replacement built
    // from a request is a replacement a caller can shape.
    transaction.update(orderRef, {
      status: to,
      statusChangedAt,
      statusChangedByUserId: actingUid,
      ...(reason ? { cancellationReason: reason } : {}),
    });

    return { restaurantId, visitId, orderId, from, to, statusChangedAt };
  });
};

/**
 * The second callable a `staff` account may reach.
 *
 * Classified `staffAuthority` in `callable-authorization.spec.ts`, beside
 * `transitionTableState` and `moveTableVisit`: it admits `staff`, `business`
 * and `admin` and then decides for itself which restaurant each of them
 * reaches. Working the pass is the same permission as working the floor.
 */
export const transitionTableOrderStatus =
  onAppCheck<TransitionTableOrderRequest>(transitionTableOrderStatusHandler);

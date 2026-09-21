import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
  requireTableStateAuthority,
} from './restaurant-authority';
import {
  TABLE_VISITS_COLLECTION,
  TableVisitSettlementMethod,
  isSettledVisit,
  isTableVisitSettlementMethod,
} from './table-visit';

/**
 * Staff recording that the party paid, and how (GitHub issue #1110).
 *
 * ## What it writes
 *
 * ```text
 * /restaurants/{id}/visits/{visitId}   paymentStatus, settlementMethod,
 *                                      settledAt, settledByUserId
 * ```
 *
 * And nothing else. It does **not** close the visit, free the table, or move
 * the table's status: a bill settled while the party is still finishing their
 * coffee is ordinary, and a callable that cleared the table on payment would
 * seat the next party at an occupied one. Closing stays `transitionTableState`'s
 * (`TABLE_STATUS_AFTER_VISIT`), and the confirmation a staff member is asked
 * for when they close an **unsettled** visit is issue #1111's.
 *
 * ## This is a record, not a transaction
 *
 * BiteTribe is not in the money flow (`ADR-0004`, `RD-TS-45`). The money moved
 * between the party and the restaurant, by card machine or at the till, and
 * this is a member of staff writing down that it did. That is why there is no
 * amount argument: an amount typed here could disagree with the bill, and a
 * second, contradictory account of what the party owed is exactly what
 * `RD-TS-16` refused for cancellations. What the party owed is the orders.
 *
 * ## Who may
 *
 * `requireTableStateAuthority`, deliberately the same guard that seats a table
 * and moves an order's status. Operating a restaurant during service is one
 * permission, and a second list of who may take payment would be free to
 * disagree with who may close the visit it belongs to.
 *
 * ## Settling twice
 *
 * Answered with the stored values and `changed: false`, following
 * `acknowledgeTableAssistance` (`RD-TS-22`) rather than
 * `transitionTableOrderStatus`. There is one destination: two members of staff
 * pressing "settled" in the same second both wanted what happened, and a
 * conflict error about a race that cost nobody anything would send one of them
 * back to the table. What it must not do is overwrite `settledAt` with a later
 * instant that describes nothing, which is the reason a visit's ending is
 * one-way too.
 *
 * The method of the **first** settlement therefore stands. A restaurant that
 * recorded cash and meant card has a correction to make, and a correction is
 * not this callable silently taking the second answer.
 */

export interface SettleTableVisitRequest {
  restaurantId?: unknown;
  visitId?: unknown;
  method?: unknown;
}

export interface TableVisitSettled {
  ok: true;
  visitId: string;
  method: TableVisitSettlementMethod;
  settledAt: number;
  settledByUserId: string;
  /** False where the visit was already settled, and nothing was written. */
  changed: boolean;
}

const parseMethod = (value: unknown): TableVisitSettlementMethod => {
  if (!isTableVisitSettlementMethod(value)) {
    throw new HttpsError(
      'invalid-argument',
      'method is not a settlement method.',
    );
  }

  return value;
};

export const settleTableVisitHandler = async (
  request: CallableRequest<SettleTableVisitRequest>,
  now: Date = new Date(),
): Promise<TableVisitSettled> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const visitId = parseRequiredString(request.data?.visitId, 'visitId');
  const method = parseMethod(request.data?.method);
  const actingUid = await requireTableStateAuthority(request, restaurantId);

  const firestore = getFirestore();
  const visitRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLE_VISITS_COLLECTION)
    .doc(visitId);
  const at = now.getTime();

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(visitRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Visit was not found.');
    }

    const visit = snapshot.data();

    // A closed or abandoned visit is still settleable, and deliberately. A
    // party that left an unpaid bill and came back to pay it the next morning
    // is a real evening, and refusing the record would leave the visit saying
    // the restaurant was never paid - which is worse than a late timestamp.
    if (isSettledVisit(visit)) {
      return {
        ok: true,
        visitId,
        method: (visit?.['settlementMethod'] ??
          'other') as TableVisitSettlementMethod,
        settledAt:
          typeof visit?.['settledAt'] === 'number' ? visit['settledAt'] : at,
        settledByUserId:
          typeof visit?.['settledByUserId'] === 'string'
            ? visit['settledByUserId']
            : actingUid,
        changed: false,
      };
    }

    transaction.update(visitRef, {
      paymentStatus: 'settled',
      settlementMethod: method,
      settledAt: at,
      settledByUserId: actingUid,
    });

    return {
      ok: true,
      visitId,
      method,
      settledAt: at,
      settledByUserId: actingUid,
      changed: true,
    };
  });
};

export const settleTableVisit = onAppCheck<
  SettleTableVisitRequest,
  Promise<TableVisitSettled>
>((request) => settleTableVisitHandler(request));

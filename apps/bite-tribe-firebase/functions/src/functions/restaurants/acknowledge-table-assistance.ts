import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
  requireTableStateAuthority,
} from './restaurant-authority';
import {
  TABLE_ASSISTANCE_REQUESTS_COLLECTION,
  TableAssistanceKind,
  TableAssistanceStatus,
  isOpenAssistanceRequest,
  isTableAssistanceKind,
  tableAssistanceRequestId,
} from './table-assistance';

/**
 * A member of staff saying they have seen it (GitHub issue #1106).
 *
 * ## Why it is a callable and not a client write
 *
 * The same answer `transitionTableState` and `transitionTableOrderStatus` give.
 * `firestore.rules` refuses every client write to `assistanceRequests`, and it
 * has to: a guest able to write there could raise a signal at a table they are
 * not sitting at, or clear one they raised to get round the cooldown, and a
 * member of staff able to write there could rewrite when it was asked for.
 *
 * ## Why there is no `expectedStatus`
 *
 * The one place this deliberately differs from the order queue beside it. An
 * order transition has four destinations, and two members of staff pressing
 * different ones in the same second is a real conflict worth refusing; an
 * acknowledgement has exactly one destination, so two people pressing it both
 * wanted what happened. A second press is therefore answered with the stored
 * values and `changed: false`, not with an error about a race that cost nobody
 * anything - and the row it was pressed on has already gone from both screens.
 *
 * ## What it does not do
 *
 * It does not move the table. A bill request moved it to `awaitingPayment` when
 * it was raised, which is where it stays until somebody pays and the visit is
 * closed - that is issue #1073. Acknowledging is staff telling the guest they
 * are coming; it is not the money arriving.
 */

/** What the staff screen sends to clear one signal. */
export interface AcknowledgeTableAssistanceRequest {
  restaurantId: string;
  tableId: string;
  kind: TableAssistanceKind;
}

export interface AcknowledgeTableAssistanceResult {
  restaurantId: string;
  tableId: string;
  kind: TableAssistanceKind;
  status: TableAssistanceStatus;
  acknowledgedAt: number;
  acknowledgedByUserId: string;
  /** False when somebody else had already taken it. */
  changed: boolean;
}

const parseKind = (value: unknown): TableAssistanceKind => {
  if (!isTableAssistanceKind(value)) {
    throw new HttpsError('invalid-argument', 'kind is not a request kind.');
  }

  return value;
};

export const acknowledgeTableAssistanceHandler = async (
  request: CallableRequest<AcknowledgeTableAssistanceRequest>,
  now: Date = new Date(),
): Promise<AcknowledgeTableAssistanceResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const tableId = parseRequiredString(request.data?.tableId, 'tableId');
  const kind = parseKind(request.data?.kind);

  // The same authority a table transition and an order transition need, and
  // deliberately the same function: operating a restaurant during service is
  // one permission, and a second list of who may answer a table would be free
  // to disagree with who may seat it.
  const actingUid = await requireTableStateAuthority(request, restaurantId);

  const assistanceRef = getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLE_ASSISTANCE_REQUESTS_COLLECTION)
    .doc(tableAssistanceRequestId(tableId, kind));

  return getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(assistanceRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'There is no request at that table.');
    }

    const stored = snapshot.data();

    if (!isOpenAssistanceRequest(stored)) {
      // Already taken, by somebody else or by a second press of the same
      // button. The stored values rather than this call's, so two devices
      // agree on who answered the table and when.
      return {
        restaurantId,
        tableId,
        kind,
        status: 'acknowledged' as const,
        acknowledgedAt:
          typeof stored?.['acknowledgedAt'] === 'number'
            ? (stored['acknowledgedAt'] as number)
            : 0,
        acknowledgedByUserId:
          typeof stored?.['acknowledgedByUserId'] === 'string'
            ? (stored['acknowledgedByUserId'] as string)
            : '',
        changed: false,
      };
    }

    const acknowledgedAt = now.getTime();

    // An update rather than a set: when it was asked for, by whom and on which
    // visit are what the guest did, and a replacement built from this request
    // would be a replacement the caller can shape.
    transaction.update(assistanceRef, {
      status: 'acknowledged',
      acknowledgedAt,
      acknowledgedByUserId: actingUid,
    });

    return {
      restaurantId,
      tableId,
      kind,
      status: 'acknowledged' as const,
      acknowledgedAt,
      acknowledgedByUserId: actingUid,
      changed: true,
    };
  });
};

/**
 * The third callable a `staff` account may reach.
 *
 * Classified `staffAuthority` in `callable-authorization.spec.ts`, beside
 * `transitionTableState`, `moveTableVisit` and `transitionTableOrderStatus`:
 * answering a table is the same permission as working the floor.
 */
export const acknowledgeTableAssistance =
  onAppCheck<AcknowledgeTableAssistanceRequest>((request) =>
    acknowledgeTableAssistanceHandler(request),
  );

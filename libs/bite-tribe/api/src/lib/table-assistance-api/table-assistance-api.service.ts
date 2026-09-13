import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetDocumentResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import {
  TABLE_ASSISTANCE_REQUESTS_COLLECTION,
  tableAssistanceRequestId,
} from 'model';
import type {
  RequestTableAssistanceRequest,
  RequestTableAssistanceResult,
  TableAssistanceKind,
  TableAssistanceRequest,
} from 'model';
import { map, type Observable } from 'rxjs';
import { RESTAURANT_COLLECTION } from '../utils/constants';
import {
  snapshotListener,
  type SnapshotDelivery,
} from '../utils/snapshot-listener';
import {
  type TableSessionCallError,
  tableSessionCallFailed,
} from '../table-session-api/table-session-api.service';

/**
 * The two things a guest asks a waiter for, and the answer coming back
 * (GitHub issue #1106).
 *
 * ## One call out, one listener back
 *
 * The call raises the signal; the listener is how the guest learns it was
 * acknowledged, which happens on somebody else's device and can happen minutes
 * later. A callable answering "acknowledged: false" would have to be polled,
 * and a poll at a table is a phone kept awake through a meal.
 *
 * ## The document is addressed rather than searched
 *
 * `tableAssistanceRequestId` derives the name from the table and the kind, so
 * the phone subscribes to it holding only what it already knows - which is the
 * same trick that lets it watch its own session, and the reason the rules can
 * admit a `get` and refuse every `list`.
 *
 * A missing document is an ordinary outcome and the rules admit it: the
 * listener attaches when the screen opens and the guest may never tap
 * anything. What comes back then is `request: undefined`, which the screen
 * reads as "nothing asked for".
 *
 * ## Why a refusal comes back as a value
 *
 * The same reason it does on the scan and the order. A guest told to wait a
 * minute before asking again has not hit an error, and neither has one whose
 * table was cleared while their phone was in their pocket. Only the transport
 * failing rejects, and `tableSessionCallFailed` turns that into the same three
 * sentences the other two screens use.
 */

/** One signal as the guest's phone reads it, with the listener's health. */
export interface LiveTableAssistanceRequest {
  /** The signal, or nothing where this table has never raised this kind. */
  request?: TableAssistanceRequest;
  /** Whether the listener is still delivering. See `SnapshotDelivery`. */
  live: boolean;
}

@Injectable({ providedIn: 'root' })
export class TableAssistanceApiService {
  private readonly errorHandler = inject(ErrorHandler);

  /**
   * Raises one, or joins the one that is already up.
   *
   * No sign-in here, following `TableOrderApiService.submit`: a signal is
   * raised from a session, and signing an unknown guest in at this point would
   * produce a fresh anonymous account with no session on it and a
   * `sessionNotFound` a moment later.
   */
  async request(
    restaurantId: string,
    tableId: string,
    kind: TableAssistanceKind,
  ): Promise<RequestTableAssistanceResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        RequestTableAssistanceRequest,
        RequestTableAssistanceResult
      >({
        name: 'requestTableAssistance',
        data: { restaurantId, tableId, kind },
      });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }

  /** One kind of signal at one table, again on every change. */
  request$(
    restaurantId: string,
    tableId: string,
    kind: TableAssistanceKind,
  ): Observable<LiveTableAssistanceRequest> {
    const reference = `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLE_ASSISTANCE_REQUESTS_COLLECTION}/${tableAssistanceRequestId(tableId, kind)}`;

    return snapshotListener<GetDocumentResult<DocumentData>>(
      (callback) =>
        FirebaseFirestore.addDocumentSnapshotListener({ reference }, callback),
      (error) => this.errorHandler.handleError(error),
    ).pipe(map(toLiveRequest));
  }
}

/**
 * One delivery, as the signal it describes.
 *
 * The document id is not read back off the snapshot: `TableAssistanceRequest.id`
 * is the derived name and is already on the stored document, so taking it from
 * the path would be a second source for one field.
 */
const toLiveRequest = (
  delivery: SnapshotDelivery<GetDocumentResult<DocumentData>>,
): LiveTableAssistanceRequest => {
  const data = delivery.event?.snapshot?.data;

  return {
    ...(data ? { request: data as TableAssistanceRequest } : {}),
    live: delivery.live,
  };
};

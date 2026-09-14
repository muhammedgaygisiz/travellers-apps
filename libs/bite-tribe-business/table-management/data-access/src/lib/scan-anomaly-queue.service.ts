import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetCollectionResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { SCAN_ANOMALIES_COLLECTION } from 'model';
import type {
  DismissScanAnomalyRequest,
  DismissScanAnomalyResult,
  ScanAnomaly,
} from 'model';
import { Observable } from 'rxjs';
import { RESTAURANT_COLLECTION } from './table-state-data-access.service';

/** The only writer of an anomaly's status (GitHub issue #1107). */
export const DISMISS_SCAN_ANOMALY_CALLABLE = 'dismissScanAnomaly';

/**
 * One delivery of every scan anomaly in the restaurant, and what it says about
 * the listener.
 *
 * The shape `TableStateSnapshot`, `TableOrderQueueSnapshot` and
 * `TableAssistanceSnapshot` all have, and for the reason issue #1096 gave the
 * first of them: a restaurant nobody is attacking and a listener the SDK
 * detached look identical from here. This one is the case where that matters
 * least and is still worth keeping - a screen that has quietly stopped hearing
 * about a code being hammered is exactly the screen somebody would point at
 * afterwards and say it never warned them.
 */
export interface ScanAnomalySnapshot {
  /** Every anomaly of the restaurant, open and dismissed alike. */
  anomalies: ScanAnomaly[];
  /** When that delivery arrived, in epoch milliseconds. */
  at: number;
  /** Whether the listener is still delivering. False from the first error on. */
  live: boolean;
}

/**
 * The staff end of a table's code being worked on (GitHub issue #1107).
 *
 * ## One plain collection listener, and no query at all
 *
 * `TableAssistanceQueueService` next door, for the same reason and by the same
 * mechanism. An anomaly is named after the table and the kind, so the
 * collection holds one document per table per kind and never grows - a
 * restaurant under a sustained attack has exactly as many documents as one that
 * is not. That makes the whole of it a single subcollection read, admitted by
 * `readsFloorPlan(restaurantId)` from the path alone: no constraints to get
 * wrong, no index to deploy, and nothing that silently starts returning more as
 * somebody tries harder.
 *
 * It is worth saying plainly what the alternative would have been. A log of
 * scan attempts is the obvious shape for this, and it is one where the cost of
 * reading the screen grows with the size of the attack - which hands whoever is
 * attacking a second, better lever than the one they started with.
 *
 * Dismissed anomalies stay at their names rather than being deleted, so what is
 * drawn is filtered in the page rather than at the query - which also means a
 * row being cleared arrives as a change to a document the screen already holds,
 * instead of as a disappearance the listener has to explain.
 *
 * ## Whoever subscribes owns the listener
 *
 * The rule `TableStateDataAccessService` states in full: a native snapshot
 * listener outlives any RxJS teardown of its own accord, so the listener
 * belongs to the subscription and the subscription ending removes it.
 */
@Injectable({ providedIn: 'root' })
export class ScanAnomalyQueueService {
  private readonly errorHandler = inject(ErrorHandler);

  /** Every anomaly of one restaurant, again on every change. */
  anomalies$(restaurantId: string): Observable<ScanAnomalySnapshot> {
    const reference = `${RESTAURANT_COLLECTION}/${restaurantId}/${SCAN_ANOMALIES_COLLECTION}`;

    return new Observable<ScanAnomalySnapshot>((subscriber) => {
      let callbackId: string | undefined;
      let unsubscribed = false;
      let last: ScanAnomalySnapshot = { anomalies: [], at: 0, live: true };

      void FirebaseFirestore.addCollectionSnapshotListener(
        { reference },
        (event, error) => {
          if (error) {
            // Reported rather than thrown at the subscriber: completing the
            // stream would leave the screen holding what it last saw with
            // nothing listening for the next and no way to say so. The rows are
            // re-emitted unchanged with `live` taken off them, because a list
            // emptied by a dead listener reads as a restaurant nobody is
            // bothering.
            this.errorHandler.handleError(error);

            last = { ...last, live: false };
            subscriber.next(last);

            return;
          }

          last = { anomalies: toAnomalies(event), at: Date.now(), live: true };
          subscriber.next(last);
        },
      ).then((id) => {
        callbackId = id;

        // The subscription can end before the registration resolves, so the
        // teardown below may already have run with no id to act on.
        if (unsubscribed) {
          void this.removeListener(id);
        }
      });

      return (): void => {
        unsubscribed = true;

        if (callbackId) {
          void this.removeListener(callbackId);
        }
      };
    });
  }

  /**
   * Marks one row read, and answers what the backend decided.
   *
   * Rejects rather than swallowing, for the reason
   * `TableAssistanceQueueService.acknowledge` does: a failure here changes what
   * is on screen, and a service returning `undefined` would leave the caller
   * unable to tell a permission problem from a row somebody else already
   * cleared.
   */
  async dismiss(
    request: DismissScanAnomalyRequest,
  ): Promise<DismissScanAnomalyResult> {
    const { data } = await FirebaseFunctions.callByName<
      DismissScanAnomalyRequest,
      DismissScanAnomalyResult
    >({ name: DISMISS_SCAN_ANOMALY_CALLABLE, data: request });

    return data;
  }

  private async removeListener(callbackId: string): Promise<void> {
    try {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    } catch (error) {
      // A listener that cannot be removed is a leak worth reporting, and must
      // not take down the flow that was merely finished with it.
      this.errorHandler.handleError(error);
    }
  }
}

/**
 * One delivery, as the rows it describes, most recently seen first.
 *
 * The opposite of the call list beside it and the same direction as the order
 * queue, for a third reason again: a row is not somebody waiting, so answering
 * the one who waited longest does not apply, and what a member of staff wants
 * to see at the top is what is happening now. A row first raised yesterday and
 * seen again a minute ago is a live problem and sorts above one that stopped.
 *
 * Sorted by `lastSeenAt` rather than by arrival: a snapshot delivers documents
 * in the query's order, which with no `orderBy` is by document name - and these
 * names are derived from table ids, which say nothing about when anything
 * happened.
 */
const toAnomalies = (
  event: GetCollectionResult<DocumentData> | null,
): ScanAnomaly[] =>
  (event?.snapshots ?? [])
    .filter((snapshot) => snapshot.data)
    .map((snapshot) => ({ ...snapshot.data, id: snapshot.id }) as ScanAnomaly)
    .sort((first, second) => second.lastSeenAt - first.lastSeenAt);

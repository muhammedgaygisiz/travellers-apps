import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetCollectionResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { TABLE_ASSISTANCE_REQUESTS_COLLECTION } from 'model';
import type {
  AcknowledgeTableAssistanceRequest,
  AcknowledgeTableAssistanceResult,
  TableAssistanceRequest,
} from 'model';
import { Observable } from 'rxjs';
import { RESTAURANT_COLLECTION } from './table-state-data-access.service';

/** The only writer of a signal's status (GitHub issue #1106). */
export const ACKNOWLEDGE_TABLE_ASSISTANCE_CALLABLE =
  'acknowledgeTableAssistance';

/**
 * One delivery of every signal in the restaurant, and what it says about the
 * listener.
 *
 * The shape `TableStateSnapshot` and `TableOrderQueueSnapshot` both have, and
 * for the reason issue #1096 gave the first of them: a quiet dining room and a
 * listener the SDK detached look identical, and a floor reading "nobody is
 * calling" off a dead listener is the one failure this must not have.
 */
export interface TableAssistanceSnapshot {
  /** Every signal of the restaurant, open and acknowledged alike. */
  requests: TableAssistanceRequest[];
  /** When that delivery arrived, in epoch milliseconds. */
  at: number;
  /** Whether the listener is still delivering. False from the first error on. */
  live: boolean;
}

/**
 * The staff end of a guest calling for a waiter (GitHub issue #1106).
 *
 * ## One plain collection listener, and no query at all
 *
 * The contrast with `TableOrderQueueService` next door is the whole design.
 * Orders hang from the visit, so tonight's are spread over one subcollection
 * per party and are unbounded - which forced a collection-group query, a
 * `where` that doubles as the permission, a second `where` to bound the read,
 * and two index exemptions deployed by hand.
 *
 * A signal is named after the table and the kind, so the collection holds two
 * documents per table and never grows. That makes the whole of it a single
 * subcollection read, admitted by `readsFloorPlan(restaurantId)` from the path
 * alone: no constraints to get wrong, no index to deploy, and nothing that
 * silently starts returning more as a restaurant has a busier evening.
 *
 * Acknowledged signals stay at their names rather than being deleted, so what
 * is drawn is filtered here rather than at the query - which also means a
 * signal being cleared arrives as a change to a document the screen already
 * holds, instead of as a disappearance the listener has to explain.
 *
 * ## Whoever subscribes owns the listener
 *
 * The rule `TableStateDataAccessService` states in full: a native snapshot
 * listener outlives any RxJS teardown of its own accord, so the listener
 * belongs to the subscription and the subscription ending removes it.
 */
@Injectable({ providedIn: 'root' })
export class TableAssistanceQueueService {
  private readonly errorHandler = inject(ErrorHandler);

  /** Every signal of one restaurant, again on every change. */
  requests$(restaurantId: string): Observable<TableAssistanceSnapshot> {
    const reference = `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLE_ASSISTANCE_REQUESTS_COLLECTION}`;

    return new Observable<TableAssistanceSnapshot>((subscriber) => {
      let callbackId: string | undefined;
      let unsubscribed = false;
      let last: TableAssistanceSnapshot = {
        requests: [],
        at: 0,
        live: true,
      };

      void FirebaseFirestore.addCollectionSnapshotListener(
        { reference },
        (event, error) => {
          if (error) {
            // Reported rather than thrown at the subscriber: completing the
            // stream would leave the floor holding what it last saw with
            // nothing listening for the next and no way to say so. The signals
            // are re-emitted unchanged with `live` taken off them, because a
            // room emptied by a dead listener reads as a dining room where
            // nobody is calling.
            this.errorHandler.handleError(error);

            last = { ...last, live: false };
            subscriber.next(last);

            return;
          }

          last = { requests: toRequests(event), at: Date.now(), live: true };
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
   * Clears one signal, and answers what the backend decided.
   *
   * Rejects rather than swallowing, for the reason
   * `TableOrderQueueService.transition` does: a failure here changes what is on
   * screen, and a service returning `undefined` would leave the caller unable
   * to tell a permission problem from a signal somebody else already took.
   */
  async acknowledge(
    request: AcknowledgeTableAssistanceRequest,
  ): Promise<AcknowledgeTableAssistanceResult> {
    const { data } = await FirebaseFunctions.callByName<
      AcknowledgeTableAssistanceRequest,
      AcknowledgeTableAssistanceResult
    >({ name: ACKNOWLEDGE_TABLE_ASSISTANCE_CALLABLE, data: request });

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
 * One delivery, as the signals it describes, oldest first.
 *
 * Oldest first, which is the opposite of the order queue and deliberately so.
 * A queue of tickets is worked from the newest because the thing that just
 * arrived is the thing nobody has looked at; a list of people waiting is worked
 * from the one who has waited longest, which is the only fair order to answer
 * a dining room in.
 *
 * Sorted by `requestedAt` rather than by arrival: a snapshot delivers documents
 * in the query's order, which with no `orderBy` is by document name - and these
 * names are derived from table ids, which say nothing about when anybody asked.
 */
const toRequests = (
  event: GetCollectionResult<DocumentData> | null,
): TableAssistanceRequest[] =>
  (event?.snapshots ?? [])
    .filter((snapshot) => snapshot.data)
    .map(
      (snapshot) =>
        ({ ...snapshot.data, id: snapshot.id }) as TableAssistanceRequest,
    )
    .sort((first, second) => first.requestedAt - second.requestedAt);

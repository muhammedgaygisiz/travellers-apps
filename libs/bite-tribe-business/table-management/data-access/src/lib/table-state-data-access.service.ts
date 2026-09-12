import { ErrorHandler, inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TableState } from 'model';
import { Observable } from 'rxjs';

export const RESTAURANT_COLLECTION = 'restaurants';

/**
 * Where each table's live state lives (GitHub issue #1091).
 *
 * ```text
 * /restaurants/{restaurantId}/tableStates/{tableId}
 * ```
 */
export const TABLE_STATES_COLLECTION = 'tableStates';

/**
 * The live state of every table in one restaurant, as the staff view reads it
 * (GitHub issue #1093).
 *
 * ## A listener, not a poll
 *
 * The acceptance criterion is that a change made on one device is on another
 * within about a second, and that is what a Firestore snapshot listener is:
 * the server pushes the changed document, so the delay is the round trip
 * rather than whatever interval a poll had been set to. A one-second poll over
 * a restaurant of forty tables would also bill forty document reads a second
 * per device on shift, for a room that changes a few dozen times a service.
 *
 * ## Read-only, and not by convention
 *
 * Nothing here writes. Issue #1092 made `transitionTableState` the only writer
 * and `firestore.rules` refuses every client write to this collection, so a
 * `set` added here would not fail review, it would fail at the database. The
 * staff actions of issue #1094 call the callable; this service only listens.
 *
 * ## Whoever subscribes owns the listener
 *
 * The same rule `ProfileApiService` arrived at in issue #1310: a native
 * snapshot listener outlives any RxJS teardown of its own accord, so
 * registering one without owning its removal keeps billing for updates nobody
 * reads until the process ends - and a second registration after a room switch
 * would overwrite the only id that could have removed the first. So the
 * listener belongs to the subscription, and the subscription ending removes
 * it.
 */
@Injectable({ providedIn: 'root' })
export class TableStateDataAccessService {
  private readonly errorHandler = inject(ErrorHandler);

  private statesReference(restaurantId: string): string {
    return `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLE_STATES_COLLECTION}`;
  }

  /**
   * Every table state of one restaurant, again on every change.
   *
   * The whole restaurant rather than one room, because a room switch must not
   * cost a new listener and a fresh set of first-snapshot reads: staff move
   * between the terrace and the dining room constantly during service, and the
   * rooms of one restaurant are a handful of documents. Filtering to the open
   * room is the view's job, and it is a filter over data that is already here.
   *
   * A table with no document is simply absent from the list. That is the
   * ordinary case rather than a gap - `tableStatusOf` in the model reads it as
   * `available` - and it is why nothing backfills a document per table before
   * this view can render.
   */
  tableStates$(restaurantId: string): Observable<TableState[]> {
    return new Observable<TableState[]>((subscriber) => {
      let callbackId: string | undefined;
      let unsubscribed = false;

      void FirebaseFirestore.addCollectionSnapshotListener(
        { reference: this.statesReference(restaurantId) },
        (event, error) => {
          if (error) {
            // Reported rather than thrown at the subscriber: a listener that
            // errors once - a dropped connection, a token being refreshed -
            // recovers on its own, and completing the stream would leave the
            // view holding the last states it saw with nothing listening for
            // the next. What staff must never see is a plan that has silently
            // stopped updating, and that is the live indicator's job rather
            // than this stream's.
            this.errorHandler.handleError(error);

            return;
          }

          subscriber.next(
            (event?.snapshots ?? [])
              .filter((snapshot) => snapshot.data)
              .map(
                (snapshot) =>
                  ({ ...snapshot.data, tableId: snapshot.id }) as TableState,
              ),
          );
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

import { ErrorHandler, inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { TableState, TableStatus } from 'model';
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

/** The only writer of that collection (GitHub issue #1092). */
export const TRANSITION_TABLE_STATE_CALLABLE = 'transitionTableState';

/** One asked-for move, as `transitionTableState` takes it. */
export interface TableTransitionRequest {
  restaurantId: string;
  tableId: string;
  /** Where the table should end up. */
  status: TableStatus;
  /**
   * The status the caller believes the table holds right now.
   *
   * Required by the callable, and it is what turns a race into a sentence: the
   * loser of two simultaneous seatings is told the table is occupied and it
   * was looking at available, rather than being refused for a transition the
   * matrix does not contain. The live view always has it - it is subscribed to
   * the very document at the moment the button is pressed.
   */
  expectedStatus: TableStatus;
  /** Why, recorded on the audit entry. Absent when there is nothing to add. */
  reason?: string;
}

/** What the callable answers with when the move was accepted. */
export interface TableTransitionResult {
  restaurantId: string;
  tableId: string;
  from: TableStatus;
  to: TableStatus;
  /** The moment the backend says the table entered `to`. */
  since: number;
  transitionId: string;
}

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
 * ## Nothing here writes Firestore
 *
 * Issue #1092 made `transitionTableState` the only writer and
 * `firestore.rules` refuses every client write to this collection, so a `set`
 * added here would not fail review, it would fail at the database. The staff
 * actions of issue #1094 therefore go through {@link transition}, which calls
 * the callable: the listener below and that one call are the whole of this
 * service's contact with table state.
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

  /**
   * Asks the backend to move one table, and answers what it decided
   * (GitHub issue #1094).
   *
   * Rejects rather than swallowing, and deliberately so: every failure here
   * changes what is on screen. A refused transition has to roll the optimistic
   * state back and say why, and a service that returned `undefined` on failure
   * would leave the caller unable to tell a conflict from a table the owner
   * took out of service. `tableTransitionFailure` turns the rejection into the
   * sentence the staff member is owed.
   */
  async transition(
    request: TableTransitionRequest,
  ): Promise<TableTransitionResult> {
    const { data } = await FirebaseFunctions.callByName<
      TableTransitionRequest,
      TableTransitionResult
    >({ name: TRANSITION_TABLE_STATE_CALLABLE, data: request });

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

import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetCollectionGroupResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { OPEN_TABLE_ORDER_STATUSES, TABLE_ORDERS_COLLECTION } from 'model';
import type {
  TableOrder,
  TransitionTableOrderRequest,
  TransitionTableOrderResult,
} from 'model';
import { Observable } from 'rxjs';

/** The only writer of an order's status (GitHub issue #1105). */
export const TRANSITION_TABLE_ORDER_STATUS_CALLABLE =
  'transitionTableOrderStatus';

/**
 * One delivery of every open order in the restaurant, and what it says about
 * the listener.
 *
 * The same shape `TableStateSnapshot` has, and for the same reason issue #1096
 * gave it one: a quiet Tuesday and a listener the SDK detached both look like
 * an empty queue, and a kitchen reading an empty queue that has silently
 * stopped updating is the one failure this screen must never have.
 */
export interface TableOrderQueueSnapshot {
  /** Every open order of the restaurant, newest first. */
  orders: TableOrder[];
  /** When that delivery arrived, in epoch milliseconds. */
  at: number;
  /** Whether the listener is still delivering. False from the first error on. */
  live: boolean;
}

/**
 * The staff queue's read and its one write (GitHub issue #1105).
 *
 * ## One collection-group listener, not one listener per table
 *
 * Orders hang from the visit (`/restaurants/{id}/visits/{visitId}/orders`),
 * which is what lets a party keep its dinner when it moves tables - and it
 * means tonight's orders are spread over one subcollection per party. The
 * alternative to the query below is a listener per open visit, attached and
 * detached on every seating and every clearing of every table, which is a
 * listener churn proportional to the service rather than to the room.
 *
 * So it is a collection group scoped by `restaurantId`, which
 * `submitTableOrder` writes on to every order for exactly this purpose.
 *
 * **The `where` on `restaurantId` is the permission, not a filter.**
 * `firestore.rules` admits `match /{path=**}/orders/{orderId}` only when the
 * query's constraints prove `readsFloorPlan(resource.data.restaurantId)`, so
 * dropping it refuses the query whole rather than widening it to every
 * restaurant in BiteTribe. It is the same mechanism the guest's own `list`
 * rests on (`RD-TS-12`), pointed at a restaurant instead of at a guest.
 *
 * **The `in` on the status is what keeps the read bounded.** Without it the
 * queue would stream every order the restaurant had ever taken, growing without
 * limit and re-read in full on every device that opens the screen. With it, an
 * order that is served or cancelled leaves the query - which is also what a
 * queue means.
 *
 * Both constraints need an index the automatic ones do not provide: a
 * single-field index is created per collection, and a collection-group query
 * needs the scope declared. `firestore.indexes.json` carries both fields at
 * `COLLECTION_GROUP` scope plus the composite, and `__specs__` fails the build
 * when it does not. Indexes deploy by hand.
 *
 * ## Sorted here rather than by Firestore
 *
 * An `orderBy` beside these constraints is another composite index, for a sort
 * over a set that is at most the open orders of one dining room. The guest's
 * own list settled the same question the same way in issue #1104.
 *
 * ## Whoever subscribes owns the listener
 *
 * The rule `TableStateDataAccessService` states in full: a native snapshot
 * listener outlives any RxJS teardown of its own accord, so the listener
 * belongs to the subscription and the subscription ending removes it.
 */
@Injectable({ providedIn: 'root' })
export class TableOrderQueueService {
  private readonly errorHandler = inject(ErrorHandler);

  /** Every open order of one restaurant, again on every change. */
  openOrders$(restaurantId: string): Observable<TableOrderQueueSnapshot> {
    return new Observable<TableOrderQueueSnapshot>((subscriber) => {
      let callbackId: string | undefined;
      let unsubscribed = false;
      let last: TableOrderQueueSnapshot = { orders: [], at: 0, live: true };

      void FirebaseFirestore.addCollectionGroupSnapshotListener(
        {
          reference: TABLE_ORDERS_COLLECTION,
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'restaurantId',
                opStr: '==',
                value: restaurantId,
              },
              {
                type: 'where',
                fieldPath: 'status',
                opStr: 'in',
                value: [...OPEN_TABLE_ORDER_STATUSES],
              },
            ],
          },
        },
        (event, error) => {
          if (error) {
            // Reported rather than thrown at the subscriber: completing the
            // stream would leave the queue holding what it last saw with
            // nothing listening for the next and no way to say so. The orders
            // are re-emitted unchanged with `live` taken off them, because a
            // list emptied by a dead listener reads as a kitchen with nothing
            // to cook.
            this.errorHandler.handleError(error);

            last = { ...last, live: false };
            subscriber.next(last);

            return;
          }

          last = { orders: toOrders(event), at: Date.now(), live: true };
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
   * Asks the backend to move one order, and answers what it decided.
   *
   * Rejects rather than swallowing, for the reason
   * `TableStateDataAccessService.transition` does: every failure here changes
   * what is on screen, and a service returning `undefined` on failure would
   * leave the caller unable to tell a race from an order somebody deleted.
   * `tableOrderFailure` turns the rejection into the sentence staff are owed.
   */
  async transition(
    request: TransitionTableOrderRequest,
  ): Promise<TransitionTableOrderResult> {
    const { data } = await FirebaseFunctions.callByName<
      TransitionTableOrderRequest,
      TransitionTableOrderResult
    >({ name: TRANSITION_TABLE_ORDER_STATUS_CALLABLE, data: request });

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
 * One delivery, as the orders it describes, newest first.
 *
 * Newest first because a queue is worked from the top and the thing that just
 * arrived is the thing nobody has looked at. Sorted by `submittedAt` rather
 * than by arrival order: a snapshot delivers documents in the query's order,
 * which without an `orderBy` is by id - and an id says nothing about when
 * anything was ordered.
 */
const toOrders = (
  event: GetCollectionGroupResult<DocumentData> | null,
): TableOrder[] =>
  (event?.snapshots ?? [])
    .filter((snapshot) => snapshot.data)
    .map((snapshot) => ({ ...snapshot.data, id: snapshot.id }) as TableOrder)
    .sort((first, second) => second.submittedAt - first.submittedAt);

import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetCollectionResult,
} from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { TABLE_ORDERS_COLLECTION, TABLE_VISITS_COLLECTION } from 'model';
import type {
  SubmitTableOrderRequest,
  SubmitTableOrderResult,
  TableOrder,
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
 * The one call a guest's cart makes (GitHub issue #1103).
 *
 * ## Why a refusal comes back as a value
 *
 * The same reason it does on the scan. A guest whose Margherita sold out while
 * they were reading the dessert list has not hit an error; they have been told
 * the kitchen is out of Margheritas, and there is a specific thing for them to
 * do about it. So the twelve refusals arrive as a resolved promise and only the
 * transport failing rejects - flight mode, App Check, a cold function - which
 * is a different sentence and the only one a screen should apologise for.
 *
 * ## No sign-in here
 *
 * Unlike `TableSessionApiService.start`, which signs the guest in because a
 * session has to belong to somebody, this one assumes a session already exists:
 * an order is placed from one, and a guest with no session has nothing to order
 * into. Signing somebody in at this point would produce a fresh anonymous
 * account with no session on it, and the order would be refused as
 * `sessionNotFound` a moment later - a sign-in that achieves a worse error.
 */
/** A guest's own orders in one visit, with the listener's health. */
export interface LiveTableOrders {
  /** Newest first. Empty where the guest has ordered nothing yet. */
  orders: TableOrder[];
  /** Whether the listener is still delivering. See `SnapshotDelivery`. */
  live: boolean;
}

@Injectable({ providedIn: 'root' })
export class TableOrderApiService {
  private readonly errorHandler = inject(ErrorHandler);

  /**
   * Sends the cart, and answers what the restaurant made of it.
   *
   * Every price in `request` is what the phone displayed, and the backend
   * compares each one to the live menu. That is not a formality the client can
   * skip by sending the menu's number: it is how "the prices on the order are
   * the prices the guest saw" is kept true across a menu edited mid-meal.
   */
  async submit(
    request: SubmitTableOrderRequest,
  ): Promise<SubmitTableOrderResult | TableSessionCallError> {
    try {
      const result = await FirebaseFunctions.callByName<
        SubmitTableOrderRequest,
        SubmitTableOrderResult
      >({ name: 'submitTableOrder', data: request });

      return result.data;
    } catch (error) {
      return tableSessionCallFailed(error);
    }
  }

  /**
   * This guest's own orders in one visit, again on every change
   * (GitHub issue #1104).
   *
   * ## Why a query and not the ids the submission answered with
   *
   * Because a reload holds none of them. Issue #1103 could watch an order it
   * had just sent - the callable answers with it - and a guest who puts their
   * phone down between the starter and the main holds nothing: an order id is
   * generated, so there is no name to derive the way a session's is derived.
   * The query is what makes the screen survive being closed and reopened,
   * which at a table it will be.
   *
   * ## The `where` is the permission, not a filter over the answer
   *
   * `firestore.rules` admits this `list` only because `guestUserId` is compared
   * to the caller's uid, and Firestore proves that by reading the constraint
   * below. Take the constraint away and the query is refused whole rather than
   * quietly returning the rest of the party's dinner - which is the shape that
   * makes `RD-TS-12` a rule rather than a habit of one call site.
   *
   * ## Ordered here rather than by Firestore
   *
   * An `orderBy` beside an equality is a composite index, and indexes in this
   * repository are deployed by hand - so the query would work against the
   * emulator and fail in production until somebody remembered. A guest's orders
   * in one meal are a handful of documents, and sorting a handful on the phone
   * costs nothing.
   */
  orders$(
    restaurantId: string,
    visitId: string,
    guestUserId: string,
  ): Observable<LiveTableOrders> {
    const reference = `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLE_VISITS_COLLECTION}/${visitId}/${TABLE_ORDERS_COLLECTION}`;

    return snapshotListener<GetCollectionResult<DocumentData>>(
      (callback) =>
        FirebaseFirestore.addCollectionSnapshotListener(
          {
            reference,
            compositeFilter: {
              type: 'and',
              queryConstraints: [
                {
                  type: 'where',
                  fieldPath: 'guestUserId',
                  opStr: '==',
                  value: guestUserId,
                },
              ],
            },
          },
          callback,
        ),
      (error) => this.errorHandler.handleError(error),
    ).pipe(map(toLiveOrders));
  }
}

/**
 * One delivery, as the orders it describes, newest first.
 *
 * Newest first because the thing a guest looks for when they pick the phone up
 * is what they just sent, and the round they ordered an hour ago is history.
 * Sorted by `submittedAt` rather than by arrival order: a snapshot delivers
 * documents in the query's order, which without an `orderBy` is by id - and an
 * id says nothing about when anything was ordered.
 *
 * A delivery that carried an error has no documents and must not be read as a
 * guest who has ordered nothing: the orders it last knew about are kept and
 * only `live` changes, so the screen says the status may be stale instead of
 * emptying the list somebody is reading.
 */
const toLiveOrders = (
  delivery: SnapshotDelivery<GetCollectionResult<DocumentData>>,
): LiveTableOrders => ({
  orders: (delivery.event?.snapshots ?? [])
    .filter((snapshot) => snapshot.data)
    .map((snapshot) => ({ ...snapshot.data, id: snapshot.id }) as TableOrder)
    .sort((first, second) => second.submittedAt - first.submittedAt),
  live: delivery.live,
});

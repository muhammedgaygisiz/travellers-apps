import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetCollectionResult,
} from '@capacitor-firebase/firestore';
import { TABLE_SESSIONS_COLLECTION } from 'model';
import type { TableSession } from 'model';
import { Observable } from 'rxjs';
import { RESTAURANT_COLLECTION } from './table-state-data-access.service';

/**
 * One delivery of every guest waiting to be seated, and what it says about the
 * listener.
 *
 * The shape every feed on these screens has. It matters here for a reason of
 * its own: this list is the only place `RD-TS-1`'s promise is kept. A scan at
 * an unseated table raises a signal staff confirm, and a listener that has
 * quietly stopped delivering turns that into a guest waiting for a confirmation
 * nobody was ever asked for.
 */
export interface PendingSessionSnapshot {
  /** Every session of the restaurant still waiting for a table to be seated. */
  sessions: TableSession[];
  /** When that delivery arrived, in epoch milliseconds. */
  at: number;
  /** Whether the listener is still delivering. False from the first error on. */
  live: boolean;
}

/** The status a session holds between the scan and the seating. */
const PENDING = 'pending';

/**
 * The guests who have scanned and are waiting for a table (GitHub issue #1107).
 *
 * ## Why this exists at all
 *
 * Issue #1101 has written these documents since it landed, and `firestore.rules`
 * has admitted every reader of the floor plan to them for just as long. Nothing
 * drew them. So `RD-TS-1` - a scan at a table nobody has seated raises a signal
 * staff confirm rather than occupying the table - was a decision whose second
 * half existed only on paper: the signal was written, and the confirming was
 * asked of a screen that did not show it.
 *
 * ## Why it is a query where the anomalies are a plain read
 *
 * Because the collection is not bounded. An anomaly is named after its table
 * and its kind, so there are as many as there are tables; a session is named
 * after its table and its *guest*, and a guest is an anonymous account that a
 * new phone mints fresh - so a restaurant accumulates one session document per
 * device per table, forever. Reading the collection whole would start cheap and
 * become the most expensive read on the floor by the end of a season.
 *
 * The `where` is on `status` alone, which the automatic single-field index
 * already covers - no composite, and so nothing to deploy by hand. Sorting is
 * done in the page rather than with an `orderBy`, which is what would have
 * needed one, and over a handful of rows.
 *
 * `pending` rather than the live set: an `active` session is a guest who has
 * been seated, which is the ordinary state of everybody in the room and not a
 * list anybody needs.
 *
 * ## Whoever subscribes owns the listener
 *
 * The rule `TableStateDataAccessService` states in full: a native snapshot
 * listener outlives any RxJS teardown of its own accord, so the listener
 * belongs to the subscription and the subscription ending removes it.
 */
@Injectable({ providedIn: 'root' })
export class PendingSessionQueueService {
  private readonly errorHandler = inject(ErrorHandler);

  /** Every pending session of one restaurant, again on every change. */
  pendingSessions$(restaurantId: string): Observable<PendingSessionSnapshot> {
    const reference = `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLE_SESSIONS_COLLECTION}`;

    return new Observable<PendingSessionSnapshot>((subscriber) => {
      let callbackId: string | undefined;
      let unsubscribed = false;
      let last: PendingSessionSnapshot = { sessions: [], at: 0, live: true };

      void FirebaseFirestore.addCollectionSnapshotListener(
        {
          reference,
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'status',
                opStr: '==',
                value: PENDING,
              },
            ],
          },
        },
        (event, error) => {
          if (error) {
            // Reported rather than thrown at the subscriber, for the reason
            // every feed on this screen gives: a list emptied by a dead
            // listener reads as a restaurant with nobody waiting, which is the
            // one thing this must never say when it is not true.
            this.errorHandler.handleError(error);

            last = { ...last, live: false };
            subscriber.next(last);

            return;
          }

          last = { sessions: toSessions(event), at: Date.now(), live: true };
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
 * One delivery, as the sessions it describes, oldest first.
 *
 * The call list's direction rather than the queue's, because these are the same
 * kind of thing: people waiting. Whoever scanned first has been standing there
 * longest, and that is the only fair order to work a door in.
 *
 * Sorted by `startedAt` rather than by arrival, because a snapshot with no
 * `orderBy` delivers documents by name - and these names are derived from table
 * ids and uids, which say nothing about when anybody arrived.
 */
const toSessions = (
  event: GetCollectionResult<DocumentData> | null,
): TableSession[] =>
  (event?.snapshots ?? [])
    .filter((snapshot) => snapshot.data)
    .map((snapshot) => ({ ...snapshot.data, id: snapshot.id }) as TableSession)
    .sort((first, second) => first.startedAt - second.startedAt);

import { inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { QueryNonFilterConstraint } from '@capacitor-firebase/firestore';
import { AuthService } from 'ta-firestore';
import { tripBiteRange } from 'model';
import type { Bite, Trip, TripDraft } from 'model';
import { BITE_COLLECTION, TRIP_COLLECTION } from '../utils/constants';
import { toBite } from '../utils/to-bite';

/**
 * Reads and writes the signed-in user's trips, and reads a trip's Bites.
 *
 * Unlike the bucket list service, failures are not swallowed here: a write the
 * user is told succeeded must have succeeded, so callers see the error.
 * `firestore.rules` keeps every trip private to its owner (issue #2352).
 */
@Injectable({ providedIn: 'root' })
export class TripApiService {
  private readonly authService = inject(AuthService);

  private requireUid(): string {
    const uid = this.authService.getUser()?.uid;

    if (!uid) {
      throw new Error('User not authenticated');
    }

    return uid;
  }

  async loadMyTrips(): Promise<Trip[]> {
    const uid = this.requireUid();

    const result = await FirebaseFirestore.getCollection({
      reference: TRIP_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          { type: 'where', fieldPath: 'userId', opStr: '==', value: uid },
        ],
      },
    });

    return result.snapshots.map(
      (snapshot) => ({ ...snapshot.data, id: snapshot.id }) as Trip,
    );
  }

  async createTrip(draft: TripDraft): Promise<Trip> {
    const uid = this.requireUid();
    const now = Date.now();

    const docResult = await FirebaseFirestore.addDocument({
      reference: TRIP_COLLECTION,
      data: {
        userId: uid,
        ...toTripFields(draft),
        createdAt: new Date(now).toISOString(),
        createdAtTimestamp: now,
      },
    });

    const result = await FirebaseFirestore.getDocument({
      reference: docResult.reference.path,
    });

    return { ...result.snapshot.data, id: result.snapshot.id } as Trip;
  }

  /**
   * Replaces the whole document so an end date that was cleared is removed
   * rather than left behind; `updateDocument` cannot delete a field here.
   */
  async updateTrip(trip: Trip, draft: TripDraft): Promise<void> {
    const now = Date.now();

    await FirebaseFirestore.setDocument({
      reference: `${TRIP_COLLECTION}/${trip.id}`,
      data: {
        userId: trip.userId,
        ...toTripFields(draft),
        ...(trip.createdAt ? { createdAt: trip.createdAt } : {}),
        ...(trip.createdAtTimestamp !== undefined
          ? { createdAtTimestamp: trip.createdAtTimestamp }
          : {}),
        updatedAt: new Date(now).toISOString(),
        updatedAtTimestamp: now,
      },
    });
  }

  /** Deletes the trip only. Its Bites are not touched. */
  async deleteTrip(tripId: string): Promise<void> {
    await FirebaseFirestore.deleteDocument({
      reference: `${TRIP_COLLECTION}/${tripId}`,
    });
  }

  /**
   * The trip owner's Bites created inside the trip's range, newest first.
   *
   * Filtered on the owner so another user's Bites in the same days never
   * join, whoever's trip this is. Served by the `bites` index on `userId`
   * ascending and `createdAtTimestamp` descending.
   */
  async loadTripBites(
    trip: Pick<Trip, 'userId' | 'startDate' | 'endDate'>,
  ): Promise<Bite[]> {
    const { fromTimestamp, toTimestamp } = tripBiteRange(trip);
    const orderNewestFirst: QueryNonFilterConstraint[] = [
      {
        type: 'orderBy',
        fieldPath: 'createdAtTimestamp',
        directionStr: 'desc',
      },
    ];

    const result = await FirebaseFirestore.getCollection({
      reference: BITE_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'userId',
            opStr: '==',
            value: trip.userId,
          },
          {
            type: 'where',
            fieldPath: 'createdAtTimestamp',
            opStr: '>=',
            value: fromTimestamp,
          },
          ...(toTimestamp === undefined
            ? []
            : [
                {
                  type: 'where' as const,
                  fieldPath: 'createdAtTimestamp',
                  opStr: '<=' as const,
                  value: toTimestamp,
                },
              ]),
        ],
      },
      queryConstraints: orderNewestFirst,
    });

    return result.snapshots.map((snapshot) => toBite(snapshot));
  }
}

/** Never writes `undefined`, which Firestore refuses. */
const toTripFields = ({ title, startDate, endDate }: TripDraft): TripDraft => ({
  title: title.trim(),
  startDate,
  ...(endDate ? { endDate } : {}),
});

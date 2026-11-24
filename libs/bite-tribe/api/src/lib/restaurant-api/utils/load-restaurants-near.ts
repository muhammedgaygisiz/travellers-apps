import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';
import type { Geopoint, Restaurant } from 'model';
import { RESTAURANT_COLLECTION } from '../../utils/constants';

/**
 * The restaurants within `radiusInM` of `center`, whether or not anybody has
 * posted a Bite there yet (GitHub issue #2308).
 *
 * A geohash range read per bound - one to nine, by geofire's own split - each
 * a single-field range on `geohash`, which Firestore indexes without a
 * composite index. The bounds overshoot the circle, so the results are cut to
 * the real distance afterwards; a restaurant two bounds share is listed once.
 * A restaurant without `geohash` is not found: the `keepRestaurantGeohash`
 * trigger writes it from the position.
 */
export const loadRestaurantsNear = async (
  center: Geopoint,
  radiusInM: number,
): Promise<Restaurant[]> => {
  const origin: [number, number] = [center.latitude, center.longitude];
  const reads = geohashQueryBounds(origin, radiusInM).map(([start, end]) =>
    FirebaseFirestore.getCollection({
      reference: RESTAURANT_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          { type: 'where', fieldPath: 'geohash', opStr: '>=', value: start },
          { type: 'where', fieldPath: 'geohash', opStr: '<=', value: end },
        ],
      },
      queryConstraints: [
        { type: 'orderBy', fieldPath: 'geohash', directionStr: 'asc' },
      ],
    }),
  );

  const byId = new Map<string, Restaurant>();

  for (const { snapshots } of await Promise.all(reads)) {
    for (const snapshot of snapshots) {
      const restaurant = { ...snapshot.data, id: snapshot.id } as Restaurant;
      const { latitude, longitude } = restaurant.position ?? {};

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        distanceBetween([latitude, longitude], origin) * 1000 <= radiusInM
      ) {
        byId.set(restaurant.id, restaurant);
      }
    }
  }

  return [...byId.values()];
};

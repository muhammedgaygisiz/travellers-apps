import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/https';
import { distanceBetween, geohashQueryBounds, Geopoint } from 'geofire-common';
import { onAppCheck } from './callable-options';

const BITE_COLLECTION = 'bites';
const DEFAULT_SEARCH_RADIUS_IN_M = 15 * 1000;

interface LoadBitesByLocationRequest {
  latitude?: unknown;
  longitude?: unknown;
}

interface LocationBite extends admin.firestore.DocumentData {
  id: string;
  likes: unknown[];
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const querySingleBound = async (
  bound: [string, string],
): Promise<admin.firestore.QueryDocumentSnapshot[]> => {
  try {
    const snapshot = await admin
      .firestore()
      .collection(BITE_COLLECTION)
      .where('geohash', '>=', bound[0])
      .where('geohash', '<=', bound[1])
      .orderBy('geohash', 'asc')
      .get();

    return snapshot.docs;
  } catch {
    return [];
  }
};

const toLocationBite = (
  doc: admin.firestore.QueryDocumentSnapshot,
): LocationBite => ({
  ...doc.data(),
  id: doc.id,
  likes: [],
});

const getPosition = (
  bite: LocationBite,
): { latitude: number; longitude: number } | undefined => {
  const position = bite.position;

  if (
    position &&
    isValidCoordinate(position.latitude) &&
    isValidCoordinate(position.longitude)
  ) {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
    };
  }

  return undefined;
};

export const loadBitesByLocation = onAppCheck<LoadBitesByLocationRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to load nearby bites.',
      );
    }

    const { latitude, longitude } = request.data;

    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      throw new HttpsError(
        'invalid-argument',
        'latitude and longitude must be numbers.',
      );
    }

    const center: Geopoint = [latitude, longitude];
    const bounds = geohashQueryBounds(center, DEFAULT_SEARCH_RADIUS_IN_M);
    const snapshots = await Promise.all(bounds.map(querySingleBound));

    return snapshots
      .flat()
      .map(toLocationBite)
      .filter((bite) => {
        const position = getPosition(bite);

        if (!position) {
          return false;
        }

        const distanceInKm = distanceBetween(
          [position.latitude, position.longitude],
          center,
        );
        const distanceInM = distanceInKm * 1000;

        return distanceInM <= DEFAULT_SEARCH_RADIUS_IN_M;
      });
  },
);

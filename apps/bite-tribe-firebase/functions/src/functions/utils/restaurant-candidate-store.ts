import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import type { RestaurantCandidate } from '../model/restaurant-candidate';
import {
  CandidateBite,
  CandidatePosition,
  CandidateRestaurant,
  filterWithinRestaurantCandidateRadius,
  getPlaceNameMatchScore,
  RestaurantCandidateDraft,
} from './restaurant-candidates';

export const BITE_COLLECTION = 'bites';
export const RESTAURANT_COLLECTION = 'restaurants';
export const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';

const MINIMUM_PLACE_NAME_MATCH_SCORE = 0.82;

export type StoredCandidateBite = CandidateBite & { restaurantId?: string };

export type PendingRestaurantCandidate = Omit<
  RestaurantCandidate,
  'position'
> & {
  position?: CandidatePosition;
};

export interface RestaurantCandidateMatchSkippedCounts {
  invalidPosition: number;
  verifiedBite: number;
  outsideRadius: number;
  nameMismatch: number;
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getString = (
  data: admin.firestore.DocumentData,
  field: string,
): string => (typeof data[field] === 'string' ? data[field] : '');

const getNumber = (
  data: admin.firestore.DocumentData,
  field: string,
): number | undefined =>
  typeof data[field] === 'number' && Number.isFinite(data[field])
    ? data[field]
    : undefined;

export const getPosition = (
  data: admin.firestore.DocumentData,
): CandidatePosition | undefined => {
  const position = data['position'];

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

const idFromPath = (value: string): string => {
  const segments = value.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? value;
};

const getNormalizedRestaurantId = (
  data: admin.firestore.DocumentData,
): string => {
  const restaurantId = getString(data, 'restaurantId');
  return restaurantId ? idFromPath(restaurantId) : '';
};

const queryCollectionByGeohashBounds = async (
  collectionName: string,
  bounds: [string, string][],
): Promise<admin.firestore.QueryDocumentSnapshot[]> => {
  const snapshots = await Promise.all(
    bounds.map(async (bound) => {
      try {
        const snapshot = await admin
          .firestore()
          .collection(collectionName)
          .where('geohash', '>=', bound[0])
          .where('geohash', '<=', bound[1])
          .orderBy('geohash', 'asc')
          .get();

        return snapshot.docs;
      } catch (error) {
        logger.warn('restaurant candidate geohash query failed', {
          collectionName,
          error,
        });
        return [];
      }
    }),
  );

  return snapshots.flat();
};

export const toCandidateBite = (
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot,
): StoredCandidateBite => {
  const data = doc.data() ?? {};
  const imagePath = getString(data, 'imagePath');
  const rating = getNumber(data, 'rating');

  return {
    id: doc.id,
    place: getString(data, 'place'),
    position: getPosition(data),
    restaurantId: getNormalizedRestaurantId(data),
    ...(imagePath ? { imagePath } : {}),
    ...(typeof rating === 'number' ? { rating } : {}),
  };
};

const toCandidateRestaurant = (
  doc: admin.firestore.QueryDocumentSnapshot,
): CandidateRestaurant => {
  const data = doc.data();

  return {
    id: doc.id,
    name: getString(data, 'name'),
    position: getPosition(data),
  };
};

const toPendingRestaurantCandidate = (
  doc: admin.firestore.QueryDocumentSnapshot,
): PendingRestaurantCandidate => {
  const data = doc.data();

  return {
    id: doc.id,
    name: getString(data, 'name'),
    normalizedName: getString(data, 'normalizedName'),
    status: getString(data, 'status') as RestaurantCandidate['status'],
    position: getPosition(data),
    geohash: getString(data, 'geohash'),
    biteIds: Array.isArray(data['biteIds'])
      ? data['biteIds'].filter(
          (biteId: unknown): biteId is string => typeof biteId === 'string',
        )
      : [],
    evidence:
      typeof data['evidence'] === 'object' && data['evidence']
        ? (data['evidence'] as RestaurantCandidate['evidence'])
        : { biteCount: 0, placeNames: {} },
  };
};

export const getNearbyVerifiedRestaurants = async (
  bounds: [string, string][],
  center: CandidatePosition,
): Promise<CandidateRestaurant[]> => {
  const geohashMatchedDocs = await queryCollectionByGeohashBounds(
    RESTAURANT_COLLECTION,
    bounds,
  );
  const docs = geohashMatchedDocs.length
    ? geohashMatchedDocs
    : (await admin.firestore().collection(RESTAURANT_COLLECTION).get()).docs;

  return filterWithinRestaurantCandidateRadius(
    docs.map(toCandidateRestaurant),
    center,
    (restaurant) => restaurant.position,
  );
};

export const getNearbyBites = async (
  bounds: [string, string][],
  selectedBite: StoredCandidateBite,
): Promise<StoredCandidateBite[]> => {
  const docs = await queryCollectionByGeohashBounds(BITE_COLLECTION, bounds);
  const bitesById = new Map<string, StoredCandidateBite>(
    docs.map((doc) => {
      const bite = toCandidateBite(doc);
      return [bite.id, bite];
    }),
  );

  bitesById.set(selectedBite.id, selectedBite);

  return [...bitesById.values()];
};

export const getNearbyPendingCandidates = async (
  bounds: [string, string][],
): Promise<PendingRestaurantCandidate[]> => {
  const docs = await queryCollectionByGeohashBounds(
    RESTAURANT_CANDIDATES_COLLECTION,
    bounds,
  );

  return docs.map(toPendingRestaurantCandidate);
};

export const getMatchingBites = (
  bites: StoredCandidateBite[],
  selectedBite: CandidateBite,
): {
  matchedBites: CandidateBite[];
  skippedCounts: RestaurantCandidateMatchSkippedCounts;
} => {
  const skippedCounts: RestaurantCandidateMatchSkippedCounts = {
    invalidPosition: 0,
    verifiedBite: 0,
    outsideRadius: 0,
    nameMismatch: 0,
  };
  const center = selectedBite.position as CandidatePosition;
  const place = selectedBite.place ?? '';
  const matchedBites = bites.filter((bite) => {
    if (!bite.position) {
      skippedCounts.invalidPosition += 1;
      return false;
    }

    if (bite.restaurantId) {
      skippedCounts.verifiedBite += 1;
      return false;
    }

    const withinRadius = filterWithinRestaurantCandidateRadius(
      [bite],
      center,
      (item) => item.position,
    ).length;

    if (!withinRadius) {
      skippedCounts.outsideRadius += 1;
      return false;
    }

    if (
      getPlaceNameMatchScore(bite.place ?? '', place) <
      MINIMUM_PLACE_NAME_MATCH_SCORE
    ) {
      skippedCounts.nameMismatch += 1;
      return false;
    }

    return true;
  });

  return { matchedBites, skippedCounts };
};

export const buildCandidateUpdate = (
  draft: RestaurantCandidateDraft,
  existing?: PendingRestaurantCandidate,
): Partial<RestaurantCandidate> => {
  const now = new Date();
  const biteIds = [
    ...new Set([...(existing?.biteIds ?? []), ...draft.biteIds]),
  ];

  return {
    name: existing?.name || draft.name,
    normalizedName: existing?.normalizedName || draft.normalizedName,
    status: 'pending',
    position: existing?.position ?? draft.position,
    geohash: existing?.geohash || draft.geohash,
    biteIds,
    evidence: {
      ...draft.evidence,
      biteCount: biteIds.length,
    },
    updatedAt: now.toISOString(),
    updatedAtTimestamp: now.getTime(),
    ...(existing
      ? {}
      : {
          createdAt: now.toISOString(),
          createdAtTimestamp: now.getTime(),
        }),
  };
};

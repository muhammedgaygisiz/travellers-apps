import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import type { RestaurantCandidate } from './model/restaurant-candidate';
import {
  aggregateRestaurantCandidateEvidence,
  CandidateBite,
  CandidatePosition,
  CandidateRestaurant,
  filterWithinRestaurantCandidateRadius,
  findPendingRestaurantCandidateDuplicate,
  findVerifiedRestaurantDuplicate,
  getPlaceNameMatchScore,
  planRestaurantCandidateGeohashBounds,
  RestaurantCandidateDraft,
} from './utils/restaurant-candidates';

const BITE_COLLECTION = 'bites';
const RESTAURANT_COLLECTION = 'restaurants';
const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';

interface ClusterRestaurantCandidateForBiteRequest {
  biteId?: unknown;
}

interface ClusterRestaurantCandidateForBiteResult {
  candidateId?: string;
  verifiedRestaurantId?: string;
  evidenceCount: number;
  matchedBiteIds: string[];
  skippedCounts: {
    invalidPosition: number;
    verifiedBite: number;
    outsideRadius: number;
    nameMismatch: number;
  };
  status: 'created' | 'updated' | 'verified-restaurant-match';
}

type PendingRestaurantCandidate = Omit<RestaurantCandidate, 'position'> & {
  position?: CandidatePosition;
};

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

const getPosition = (
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

const toCandidateBite = (
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot,
): CandidateBite & { restaurantId?: string } => {
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

const getNearbyVerifiedRestaurants = async (
  bounds: [string, string][],
  selectedBite: CandidateBite,
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
    selectedBite.position as CandidatePosition,
    (restaurant) => restaurant.position,
  );
};

const getNearbyBites = async (
  bounds: [string, string][],
  selectedBite: CandidateBite,
): Promise<CandidateBite[]> => {
  const docs = await queryCollectionByGeohashBounds(BITE_COLLECTION, bounds);
  const bitesById = new Map<string, CandidateBite & { restaurantId?: string }>(
    docs.map((doc) => {
      const bite = toCandidateBite(doc);
      return [bite.id, bite];
    }),
  );

  bitesById.set(selectedBite.id, selectedBite);

  return [...bitesById.values()];
};

const getNearbyPendingCandidates = async (
  bounds: [string, string][],
): Promise<PendingRestaurantCandidate[]> => {
  const docs = await queryCollectionByGeohashBounds(
    RESTAURANT_CANDIDATES_COLLECTION,
    bounds,
  );

  return docs.map(toPendingRestaurantCandidate);
};

const getMatchingBites = (
  bites: Array<CandidateBite & { restaurantId?: string }>,
  selectedBite: CandidateBite,
): {
  matchedBites: CandidateBite[];
  skippedCounts: ClusterRestaurantCandidateForBiteResult['skippedCounts'];
} => {
  const skippedCounts = {
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

    if (getPlaceNameMatchScore(bite.place ?? '', place) < 0.82) {
      skippedCounts.nameMismatch += 1;
      return false;
    }

    return true;
  });

  return { matchedBites, skippedCounts };
};

const buildCandidateUpdate = (
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

export const clusterRestaurantCandidateForBite =
  onCall<ClusterRestaurantCandidateForBiteRequest>(async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to cluster restaurant candidates.',
      );
    }

    if (typeof request.data.biteId !== 'string' || !request.data.biteId) {
      throw new HttpsError('invalid-argument', 'biteId must be a string.');
    }

    const selectedBiteDoc = await admin
      .firestore()
      .collection(BITE_COLLECTION)
      .doc(request.data.biteId)
      .get();

    if (!selectedBiteDoc.exists) {
      throw new HttpsError('not-found', 'Selected Bite was not found.');
    }

    const selectedBite = toCandidateBite(selectedBiteDoc);

    if (!selectedBite.place?.trim() || !selectedBite.position) {
      throw new HttpsError(
        'failed-precondition',
        'Selected Bite needs a place name and position.',
      );
    }

    logger.info('manual restaurant candidate clustering started', {
      biteId: selectedBite.id,
    });

    const bounds = planRestaurantCandidateGeohashBounds(selectedBite.position);
    const [nearbyRestaurants, nearbyBites, nearbyCandidates] =
      await Promise.all([
        getNearbyVerifiedRestaurants(bounds, selectedBite),
        getNearbyBites(bounds, selectedBite),
        getNearbyPendingCandidates(bounds),
      ]);
    const verifiedRestaurantDuplicate = findVerifiedRestaurantDuplicate(
      nearbyRestaurants,
      selectedBite.place,
      selectedBite.position,
    );

    if (verifiedRestaurantDuplicate) {
      logger.info('manual clustering matched verified restaurant', {
        biteId: selectedBite.id,
        restaurantId: verifiedRestaurantDuplicate.item.id,
      });

      return {
        verifiedRestaurantId: verifiedRestaurantDuplicate.item.id,
        evidenceCount: 0,
        matchedBiteIds: [],
        skippedCounts: {
          invalidPosition: 0,
          verifiedBite: 0,
          outsideRadius: 0,
          nameMismatch: 0,
        },
        status: 'verified-restaurant-match',
      } satisfies ClusterRestaurantCandidateForBiteResult;
    }

    const { matchedBites, skippedCounts } = getMatchingBites(
      nearbyBites,
      selectedBite,
    );
    const draft = aggregateRestaurantCandidateEvidence(
      matchedBites,
      selectedBite.place,
      selectedBite.position,
    );
    const pendingDuplicate = findPendingRestaurantCandidateDuplicate(
      nearbyCandidates,
      selectedBite.place,
      selectedBite.position,
    );
    const candidateRef = pendingDuplicate
      ? admin
          .firestore()
          .collection(RESTAURANT_CANDIDATES_COLLECTION)
          .doc(pendingDuplicate.item.id)
      : admin.firestore().collection(RESTAURANT_CANDIDATES_COLLECTION).doc();
    const candidateUpdate = buildCandidateUpdate(draft, pendingDuplicate?.item);

    await candidateRef.set(candidateUpdate, { merge: true });

    logger.info('manual restaurant candidate clustering finished', {
      biteId: selectedBite.id,
      candidateId: candidateRef.id,
      evidenceCount: candidateUpdate.evidence?.biteCount,
      status: pendingDuplicate ? 'updated' : 'created',
    });

    return {
      candidateId: candidateRef.id,
      evidenceCount:
        candidateUpdate.evidence?.biteCount ?? draft.biteIds.length,
      matchedBiteIds: draft.biteIds,
      skippedCounts,
      status: pendingDuplicate ? 'updated' : 'created',
    } satisfies ClusterRestaurantCandidateForBiteResult;
  });

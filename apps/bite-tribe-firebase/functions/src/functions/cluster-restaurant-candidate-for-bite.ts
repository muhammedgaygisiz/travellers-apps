import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from './callable-options';
import {
  aggregateRestaurantCandidateEvidence,
  findPendingRestaurantCandidateDuplicate,
  findVerifiedRestaurantDuplicate,
  planRestaurantCandidateGeohashBounds,
} from './utils/restaurant-candidates';
import {
  BITE_COLLECTION,
  RESTAURANT_CANDIDATES_COLLECTION,
  RestaurantCandidateMatchSkippedCounts,
  buildCandidateUpdate,
  buildRestaurantCandidateDocumentId,
  getMatchingBites,
  getNearbyBites,
  getNearbyPendingCandidates,
  getNearbyVerifiedRestaurants,
  toCandidateBite,
} from './utils/restaurant-candidate-store';

interface ClusterRestaurantCandidateForBiteRequest {
  biteId?: unknown;
}

interface ClusterRestaurantCandidateForBiteResult {
  candidateId?: string;
  verifiedRestaurantId?: string;
  evidenceCount: number;
  matchedBiteIds: string[];
  skippedCounts: RestaurantCandidateMatchSkippedCounts;
  status: 'created' | 'updated' | 'verified-restaurant-match';
}

export const clusterRestaurantCandidateForBite =
  onAppCheck<ClusterRestaurantCandidateForBiteRequest>(async (request) => {
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
        getNearbyVerifiedRestaurants(bounds, selectedBite.position),
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
      : admin
          .firestore()
          .collection(RESTAURANT_CANDIDATES_COLLECTION)
          .doc(buildRestaurantCandidateDocumentId(draft));
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

import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  aggregateRestaurantCandidateEvidence,
  findPendingRestaurantCandidateDuplicate,
  findVerifiedRestaurantDuplicate,
  planRestaurantCandidateGeohashBounds,
} from '../shared/utils/restaurant-candidates';
import {
  BITE_COLLECTION,
  RestaurantCandidateMatchSkippedCounts,
  getMatchingBites,
  getNearbyBites,
  getNearbyPendingCandidates,
  getNearbyVerifiedRestaurants,
  toCandidateBite,
  writeRestaurantCandidate,
} from '../shared/utils/restaurant-candidate-store';

interface ClusterRestaurantCandidateForBiteRequest {
  biteId?: unknown;
}

interface ClusterRestaurantCandidateForBiteResult {
  candidateId?: string;
  /** The decided Candidate's status, when the write was refused. */
  candidateStatus?: string;
  verifiedRestaurantId?: string;
  evidenceCount: number;
  matchedBiteIds: string[];
  skippedCounts: RestaurantCandidateMatchSkippedCounts;
  status:
    | 'created'
    | 'updated'
    | 'verified-restaurant-match'
    | 'candidate-already-decided';
}

/**
 * Clusters one Bite into a restaurant candidate on demand.
 *
 * Operator-only. It is the manual half of the automatic clustering trigger and
 * writes candidate documents for Bites the caller does not own; the only
 * surface that offers it is the admin migrations page (issue #1472).
 */
export const clusterRestaurantCandidateForBite =
  onAppCheck<ClusterRestaurantCandidateForBiteRequest>(async (request) => {
    requireAdmin(request);

    if (typeof request.data.biteId !== 'string' || !request.data.biteId) {
      throw new HttpsError('invalid-argument', 'biteId must be a string.');
    }

    const selectedBiteDoc = await getFirestore()
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

    logOperatorAction(request, {
      action: 'clusterRestaurantCandidateForBite',
      targetType: 'bite',
      targetId: selectedBite.id,
      outcome: 'started',
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
      logOperatorAction(request, {
        action: 'clusterRestaurantCandidateForBite',
        targetType: 'bite',
        targetId: selectedBite.id,
        outcome: 'succeeded',
        details: {
          restaurantId: verifiedRestaurantDuplicate.item.id,
          status: 'verified-restaurant-match',
        },
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
    const writeResult = await writeRestaurantCandidate(
      draft,
      pendingDuplicate?.item.id,
    );

    if (writeResult.outcome === 'refused') {
      // The place has already been decided. Its Bites stay unlinked, which
      // keeps them on the Bite-places surface (RD-VRC-9).
      logOperatorAction(request, {
        action: 'clusterRestaurantCandidateForBite',
        targetType: 'bite',
        targetId: selectedBite.id,
        outcome: 'succeeded',
        details: {
          candidateId: writeResult.candidateId,
          candidateStatus: writeResult.candidateStatus,
          refusedBiteIds: draft.biteIds,
          status: 'candidate-already-decided',
        },
      });

      return {
        candidateId: writeResult.candidateId,
        candidateStatus: writeResult.candidateStatus,
        evidenceCount: 0,
        matchedBiteIds: [],
        skippedCounts,
        status: 'candidate-already-decided',
      } satisfies ClusterRestaurantCandidateForBiteResult;
    }

    const status = writeResult.created ? 'created' : 'updated';

    logOperatorAction(request, {
      action: 'clusterRestaurantCandidateForBite',
      targetType: 'bite',
      targetId: selectedBite.id,
      outcome: 'succeeded',
      details: {
        candidateId: writeResult.candidateId,
        evidenceCount: writeResult.evidenceCount,
        status,
      },
    });

    return {
      candidateId: writeResult.candidateId,
      evidenceCount: writeResult.evidenceCount,
      matchedBiteIds: draft.biteIds,
      skippedCounts,
      status,
    } satisfies ClusterRestaurantCandidateForBiteResult;
  });

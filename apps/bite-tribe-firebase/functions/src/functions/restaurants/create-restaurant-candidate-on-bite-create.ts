import { DocumentSnapshot } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import {
  aggregateRestaurantCandidateEvidence,
  findPendingRestaurantCandidateDuplicate,
  findVerifiedRestaurantDuplicate,
  planRestaurantCandidateGeohashBounds,
} from '../shared/utils/restaurant-candidates';
import {
  getMatchingBites,
  getNearbyBites,
  getNearbyPendingCandidates,
  getNearbyVerifiedRestaurants,
  toCandidateBite,
  writeRestaurantCandidate,
} from '../shared/utils/restaurant-candidate-store';

// Automatic candidate detection only fires once enough repeated nearby
// evidence exists. Manual clustering (#940) intentionally has no threshold
// because a business user opts into it explicitly.
export const RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD = 5;

export const handleCreateRestaurantCandidateOnBiteCreate = async (
  snap: DocumentSnapshot,
  biteId = snap.id,
): Promise<void> => {
  const selectedBite = toCandidateBite(snap);

  if (selectedBite.restaurantId) {
    // Bite already belongs to a verified restaurant; nothing to cluster.
    return;
  }

  if (!selectedBite.place?.trim() || !selectedBite.position) {
    logger.info(
      'createRestaurantCandidateOnBiteCreate: bite missing place or position',
      { biteId },
    );
    return;
  }

  const bounds = planRestaurantCandidateGeohashBounds(selectedBite.position);
  const [nearbyRestaurants, nearbyBites, nearbyCandidates] = await Promise.all([
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
    // A matching verified restaurant already exists nearby. Do not create a
    // candidate; the verified-restaurant confirmation flow (#943) owns this
    // match for the user.
    logger.info(
      'createRestaurantCandidateOnBiteCreate: matched verified restaurant',
      { biteId, restaurantId: verifiedRestaurantDuplicate.item.id },
    );
    return;
  }

  const { matchedBites } = getMatchingBites(nearbyBites, selectedBite);

  if (matchedBites.length < RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD) {
    logger.info(
      'createRestaurantCandidateOnBiteCreate: below evidence threshold',
      { biteId, matchedBiteCount: matchedBites.length },
    );
    return;
  }

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
    // The place has already been decided. Its Bites stay unlinked, which keeps
    // them on the admin app's Bite-places surface (RD-VRC-9).
    logger.warn(
      'createRestaurantCandidateOnBiteCreate: candidate already decided, write refused',
      {
        biteId,
        candidateId: writeResult.candidateId,
        candidateStatus: writeResult.candidateStatus,
        refusedBiteIds: draft.biteIds,
      },
    );
    return;
  }

  logger.info('createRestaurantCandidateOnBiteCreate: candidate stored', {
    biteId,
    candidateId: writeResult.candidateId,
    evidenceCount: writeResult.evidenceCount,
    status: writeResult.created ? 'created' : 'updated',
  });
};

export const createRestaurantCandidateOnBiteCreate = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('createRestaurantCandidateOnBiteCreate: no bite snapshot');
      return;
    }

    await handleCreateRestaurantCandidateOnBiteCreate(snap, biteId);
  },
);

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import {
  aggregateRestaurantCandidateEvidence,
  findPendingRestaurantCandidateDuplicate,
  findVerifiedRestaurantDuplicate,
  planRestaurantCandidateGeohashBounds,
} from './utils/restaurant-candidates';
import {
  RESTAURANT_CANDIDATES_COLLECTION,
  buildCandidateUpdate,
  buildRestaurantCandidateDocumentId,
  getMatchingBites,
  getNearbyBites,
  getNearbyPendingCandidates,
  getNearbyVerifiedRestaurants,
  toCandidateBite,
} from './utils/restaurant-candidate-store';

// Automatic candidate detection only fires once enough repeated nearby
// evidence exists. Manual clustering (#940) intentionally has no threshold
// because a business user opts into it explicitly.
export const RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD = 5;

export const createRestaurantCandidateOnBiteCreate = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('createRestaurantCandidateOnBiteCreate: no bite snapshot');
      return;
    }

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

    logger.info('createRestaurantCandidateOnBiteCreate: candidate stored', {
      biteId,
      candidateId: candidateRef.id,
      evidenceCount: candidateUpdate.evidence?.biteCount,
      status: pendingDuplicate ? 'updated' : 'created',
    });
  },
);

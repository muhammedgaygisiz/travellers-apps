import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';
import { hiddenReviewRef } from './hidden-review';

/**
 * Removes a hidden review's kept text when the review goes (GitHub issue
 * #2118).
 *
 * A trigger for the reason `deleteReviewReportsOnReviewDelete` is one: a review
 * also goes with its Bite, with its author's account, when an empty tombstone
 * above it is pruned, and from the Firebase console.
 */
export const deleteHiddenReviewOnReviewDelete = onDocumentDeleted(
  'reviews/{reviewId}',
  async (event) => {
    const reviewId = event.params.reviewId;

    if (event.data?.data()?.['hiddenAt'] === undefined) {
      return;
    }

    await hiddenReviewRef(getFirestore(), reviewId).delete();

    logger.info('deleteHiddenReviewOnReviewDelete: hidden copy removed', {
      reviewId,
    });
  },
);

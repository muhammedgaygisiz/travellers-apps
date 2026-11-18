import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';
import { deleteReviewReportsForReview } from './review-report';

/**
 * Removes a review's reports when the review goes (GitHub issue #2117).
 *
 * A trigger rather than a step in `deleteReview`, for the reason
 * `deleteBiteReportsOnBiteDelete` is one: a review also goes when the account
 * that wrote it is deleted, when an empty tombstone above it is pruned, and
 * from the Firebase console.
 */
export const deleteReviewReportsOnReviewDelete = onDocumentDeleted(
  'reviews/{reviewId}',
  async (event) => {
    const reviewId = event.params.reviewId;
    const deletedReports = await deleteReviewReportsForReview(
      getFirestore(),
      reviewId,
    );

    if (deletedReports > 0) {
      logger.info('deleteReviewReportsOnReviewDelete: reports removed', {
        reviewId,
        deletedReports,
      });
    }
  },
);

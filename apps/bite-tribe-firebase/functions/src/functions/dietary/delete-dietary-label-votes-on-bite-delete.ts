import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';
import { deleteDietaryLabelVotesForBite } from './dietary-votes';

/**
 * Removes a Bite's dietary label counts and the votes on it when the Bite
 * goes (GitHub issue #2197). A trigger for the reason
 * `deleteBiteReportsOnBiteDelete` gives: a Bite is deleted from three places,
 * and only one of them runs in Functions.
 */
export const deleteDietaryLabelVotesOnBiteDelete = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    const biteId = event.params.biteId;
    const deletedVotes = await deleteDietaryLabelVotesForBite(
      getFirestore(),
      biteId,
    );

    if (deletedVotes > 0) {
      logger.info('deleteDietaryLabelVotesOnBiteDelete: votes removed', {
        biteId,
        deletedVotes,
      });
    }
  },
);

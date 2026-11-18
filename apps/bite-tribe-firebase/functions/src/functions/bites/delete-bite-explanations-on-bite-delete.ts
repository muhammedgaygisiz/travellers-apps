import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';
import { deleteBiteExplanationsForBite } from './explain-bite';

/**
 * Removes a Bite's AI explanations when the Bite goes (issue #2106).
 *
 * A trigger for the reason `deleteBiteReportsOnBiteDelete` gives: a Bite is
 * deleted from the consumer app, `deleteBiteAsOperator` and the Firebase
 * console, and only one of them runs in Functions.
 */
export const deleteBiteExplanationsOnBiteDelete = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    const biteId = event.params.biteId;
    const deleted = await deleteBiteExplanationsForBite(getFirestore(), biteId);

    if (deleted > 0) {
      logger.info('deleteBiteExplanationsOnBiteDelete: explanations removed', {
        biteId,
        deleted,
      });
    }
  },
);

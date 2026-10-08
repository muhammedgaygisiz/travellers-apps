import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';
import { deleteBiteReportsForBite } from './bite-report';

/**
 * Removes a Bite's reports when the Bite goes (GitHub issue #1608).
 *
 * A trigger rather than a step in each delete, because a Bite is deleted from
 * three places - its author in the consumer app, `deleteBiteAsOperator`, and
 * the Firebase console - and only one of them runs in Functions. A report left
 * behind would sit in the operator queue as a Bite that cannot be opened.
 */
export const deleteBiteReportsOnBiteDelete = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    const biteId = event.params.biteId;
    const deletedReports = await deleteBiteReportsForBite(
      getFirestore(),
      biteId,
    );

    if (deletedReports > 0) {
      logger.info('deleteBiteReportsOnBiteDelete: reports removed', {
        biteId,
        deletedReports,
      });
    }
  },
);

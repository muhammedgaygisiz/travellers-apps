import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';

/** The author-only subcollection under a Bite (GitHub issue #1290). */
export const BITE_AUTHOR_PRIVATE_SUBCOLLECTION = 'authorPrivate';

/**
 * Removes what the author kept privately about a Bite when the Bite goes
 * (GitHub issue #1290).
 *
 * Firestore does not delete a subcollection with its parent, and the document
 * holds the position read from the photo - the one the author may have decided
 * not to publish. A trigger rather than a step in each delete, for the reason
 * `deleteBiteReportsOnBiteDelete` gives: a Bite is deleted from the consumer
 * app, by `deleteBiteAsOperator`, and from the Firebase console.
 */
export const deleteBiteAuthorPrivateOnBiteDelete = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    const biteId = event.params.biteId;
    const deleted = await deleteBiteAuthorPrivate(biteId);

    if (deleted > 0) {
      logger.info('deleteBiteAuthorPrivateOnBiteDelete: removed', {
        biteId,
        deleted,
      });
    }
  },
);

export const deleteBiteAuthorPrivate = async (
  biteId: string,
): Promise<number> => {
  const db = getFirestore();
  const snapshot = await db
    .collection('bites')
    .doc(biteId)
    .collection(BITE_AUTHOR_PRIVATE_SUBCOLLECTION)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
};

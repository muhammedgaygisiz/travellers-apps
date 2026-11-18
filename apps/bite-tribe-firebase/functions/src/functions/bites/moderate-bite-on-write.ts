import {
  DocumentData,
  FieldValue,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import { recordContentRefusal } from '../shared/moderation/content-refusal';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import {
  biteContentChanged,
  biteContentText,
  judgeBiteContent,
} from './bite-content';
import {
  deleteImagesForBite,
  deleteLikesForBite,
  deleteReviewsForBite,
  removeBiteFromBiteTrails,
  removeBiteFromBucketlists,
  removeBiteFromRestaurantCandidates,
} from './delete-bite-as-operator';

/** The push type the app routes on; an edit's carries the Bite to open. */
export const BITE_CONTENT_REFUSED_TYPE = 'BITE_CONTENT_REFUSED';

/**
 * The text fields put back as they were, or removed where the Bite had none.
 * `name` is always present on a Bite, so it is never removed.
 */
export const revertedContent = (
  before: DocumentData,
): Record<string, unknown> => ({
  name: typeof before['name'] === 'string' ? before['name'] : '',
  tags: Array.isArray(before['tags']) ? before['tags'] : FieldValue.delete(),
  description:
    typeof before['description'] === 'string'
      ? before['description']
      : FieldValue.delete(),
});

/**
 * Removes a refused new Bite and what a few seconds of existence can have
 * attached to it, with the operator delete's own steps (issue #1475). Its
 * delete triggers take the rest: the Bite count, the author-private document,
 * the explanations and the reports.
 */
const removeRefusedBite = async (
  db: Firestore,
  biteId: string,
  bite: DocumentData,
): Promise<void> => {
  await deleteLikesForBite(db, biteId);
  await deleteReviewsForBite(db, biteId);
  await deleteImagesForBite(biteId, bite);
  await removeBiteFromRestaurantCandidates(db, biteId);
  await removeBiteFromBucketlists(db, biteId);
  await removeBiteFromBiteTrails(db, biteId);
  await db.collection('bites').doc(biteId).delete();
};

const notifyAuthor = async (
  uid: string,
  biteId: string,
  action: 'reverted' | 'deleted',
): Promise<void> => {
  try {
    await sendLocalizedNotification({
      uids: [uid],
      data: {
        type: BITE_CONTENT_REFUSED_TYPE,
        ...(action === 'reverted' ? { biteId } : {}),
      },
      buildMessage: (translate) => ({
        title: translate('biteContentRefused.title'),
        body: translate(
          action === 'reverted'
            ? 'biteContentRefused.bodyReverted'
            : 'biteContentRefused.bodyDeleted',
        ),
      }),
    });
  } catch (error) {
    logger.warn('moderateBiteOnWrite: author not told', {
      uid,
      biteId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * The server's half of the Bite check (issue #1610): every write that changes
 * a Bite's name, tags or description is judged, whether or not the form's
 * `checkBiteContent` ran first.
 *
 * A Bite is written by the app so that it can be saved offline (`RD-QG-1`),
 * which means this runs after the text is stored. What fails is undone at
 * once: an edit gets its previous text back, and a new Bite is removed, since
 * it has no earlier text to fall back on. The author is told by push either
 * way, and the refusal is recorded.
 *
 * **The bound this accepts:** between the write and this trigger - seconds -
 * the text is readable by other members. The form's check closes that window
 * for every save made online through the app; it stays open for a Bite saved
 * offline, and for a client that skips the form. The new-Bite and tagged-user
 * pushes judge the text themselves, so neither sends it out in that window.
 *
 * The revert is itself a content change and runs this again; the text it puts
 * back was allowed before, so the second run finds nothing to do.
 */
export const moderateBiteOnWrite = onDocumentWritten(
  { document: 'bites/{biteId}', timeoutSeconds: 120 },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const biteId = event.params.biteId;

    if (!after || !biteContentChanged(before, after)) {
      return;
    }

    const db = getFirestore();
    const verdict = await judgeBiteContent(db, after);

    if (verdict.verdict === 'allowed') {
      return;
    }

    const uid = typeof after['userId'] === 'string' ? after['userId'] : '';
    const action = before ? 'reverted' : 'deleted';

    if (before) {
      await db.collection('bites').doc(biteId).update(revertedContent(before));
    } else {
      await removeRefusedBite(db, biteId, after);
    }

    recordContentRefusal({
      uid,
      surface: 'bite',
      stage: 'trigger',
      targetId: biteId,
      action,
      verdict,
      text: biteContentText(after),
    });

    if (uid) {
      await notifyAuthor(uid, biteId, action);
    }
  },
);

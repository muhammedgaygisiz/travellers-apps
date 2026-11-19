import {
  DocumentReference,
  FieldValue,
  Firestore,
} from 'firebase-admin/firestore';

/**
 * Where the text of a hidden review or reply is kept (GitHub issue #2118).
 *
 * ```text
 * /hiddenReviews/{reviewId}
 * ```
 *
 * `/reviews` is readable by every member, so a hidden item cannot keep its
 * text there behind a flag the app filters on. `hideReviewAsOperator` moves
 * the text and the author's name here, beside the operator who hid it, why and
 * when, and leaves the public document in place without them so the replies
 * under it keep their parent.
 *
 * Written only through the Admin SDK. `firestore.rules` lets an operator read
 * it, and the account whose uid is its `authorId`, so an author can see what
 * was hidden; nobody writes it.
 *
 * Kept, not deleted, so the decision can be reviewed later. It goes when its
 * review goes: `deleteHiddenReviewOnReviewDelete` for a deleted document,
 * `deleteReview` for one that becomes a tombstone, and
 * {@link deleteHiddenReviewsForAccount} for the author's account deletion.
 */
export const HIDDEN_REVIEWS_COLLECTION = 'hiddenReviews';

export interface HiddenReview {
  reviewId: string;
  review: string;
  author: string;
  authorId: string;
  /** As the review stores it, `/bites/{id}`. */
  biteId: string;
  /** The top-level review of the thread; the review's own id for a review. */
  threadId: string;
  /** Absent for a top-level review. */
  parentReviewId?: string;
  createdAt?: string;
  updatedAt?: string;
  hiddenBy: string;
  reason: string;
  hiddenAt: string;
  hiddenAtTimestamp: number;
}

export const isHidden = (data: Record<string, unknown> | undefined): boolean =>
  data?.['hiddenAt'] !== undefined;

/**
 * What hiding takes off the public review: the text and the name, and the
 * edit marker with them, as a tombstone does. `authorId` stays, so the author
 * can still find and delete it, and so can the account deletion.
 */
export const hiddenUpdate = (now: Date): Record<string, unknown> => ({
  review: FieldValue.delete(),
  author: FieldValue.delete(),
  updatedAt: FieldValue.delete(),
  updatedAtTimestamp: FieldValue.delete(),
  hiddenAt: now.toISOString(),
  hiddenAtTimestamp: now.getTime(),
});

export const hiddenReviewRef = (
  db: Firestore,
  reviewId: string,
): DocumentReference => db.collection(HIDDEN_REVIEWS_COLLECTION).doc(reviewId);

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

/**
 * Deletes the hidden copies of everything an account wrote, for the
 * account-deletion cascade. A hidden item the account wrote that holds up
 * somebody else's reply survives as a tombstone, which the delete trigger
 * never sees, so its copy is found here by its `authorId`.
 */
export const deleteHiddenReviewsForAccount = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const hidden = await db
    .collection(HIDDEN_REVIEWS_COLLECTION)
    .where('authorId', '==', uid)
    .get();

  for (let index = 0; index < hidden.docs.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();

    hidden.docs
      .slice(index, index + WRITE_BATCH_LIMIT)
      .forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  return hidden.size;
};

import { Review } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  BITE_COLLECTION,
  HIDDEN_REVIEW_COLLECTION,
  REVIEW_COLLECTION,
} from '../../utils/constants';
import { loadDisplayNamesById } from './load-display-names-by-id';

/**
 * Replaces the name stored on each review with the one on its author's profile.
 *
 * The `author` string is denormalised onto the review at write time, and until
 * issue #1308 it was copied from the Firebase Auth user, so every review
 * written through a Google or Apple sign-in holds the author's legal name.
 * Correcting the write path cannot correct what is already stored, so the name
 * is resolved through `authorId` here instead. That also makes a display-name
 * change show up on the reviews the person wrote before it.
 *
 * A review whose author cannot be resolved — one written before `authorId` was
 * carried, or one whose account is gone — keeps its stored name, which is the
 * only attribution it has left.
 */
const withResolvedAuthors = async (reviews: Review[]): Promise<Review[]> => {
  const displayNames = await loadDisplayNamesById(
    reviews
      .map((review) => review.authorId)
      .filter((authorId): authorId is string => !!authorId),
  );

  return reviews.map((review) => {
    // A hidden item shows no author to anybody (issue #2118).
    if (review.hiddenAt) {
      return review;
    }

    const displayName = review.authorId
      ? displayNames.get(review.authorId)
      : undefined;

    return displayName ? { ...review, author: displayName } : review;
  });
};

/**
 * The kept text of a hidden item, for its own author only (issue #2118). The
 * rules refuse the read to anybody else, so it is never attempted for them; a
 * failed read leaves the author with the same hidden line everybody sees.
 */
const hiddenTextOf = async (reviewId: string): Promise<string | undefined> => {
  try {
    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: `${HIDDEN_REVIEW_COLLECTION}/${reviewId}`,
    });
    const text = snapshot?.data?.['review'];

    return typeof text === 'string' ? text : undefined;
  } catch {
    return undefined;
  }
};

const withOwnHiddenText = (
  reviews: Review[],
  viewerUid: string | undefined,
): Promise<Review[]> =>
  Promise.all(
    reviews.map(async (review) => {
      if (!review.hiddenAt || !viewerUid || review.authorId !== viewerUid) {
        return review;
      }

      const hiddenReview = await hiddenTextOf(review.id);

      return hiddenReview === undefined ? review : { ...review, hiddenReview };
    }),
  );

/**
 * `viewerUid` is the signed-in reader, so their own hidden items can show
 * them what was hidden (issue #2118). Without it nobody's hidden text is read.
 */
export const loadReviewsByBiteId = async (
  biteId: string,
  viewerUid?: string,
): Promise<Review[]> => {
  const reviewDocs = await FirebaseFirestore.getCollection({
    reference: REVIEW_COLLECTION,
    compositeFilter: {
      type: 'and',
      queryConstraints: [
        {
          type: 'where',
          fieldPath: 'biteId',
          opStr: '==',
          value: `/${BITE_COLLECTION}/${biteId}`,
        },
      ],
    },
  });

  // A tombstone (issue #2116) and a hidden item (issue #2118) have no text and
  // no author; each is handed on with both empty so every reader still gets
  // the strings `Review` promises.
  const reviews = reviewDocs.snapshots.map(
    (reviewDoc) =>
      ({
        ...(reviewDoc.data?.['deletedAt'] || reviewDoc.data?.['hiddenAt']
          ? { review: '', author: '' }
          : {}),
        ...reviewDoc.data,
        id: reviewDoc.id,
      }) as Review,
  );

  return withOwnHiddenText(await withResolvedAuthors(reviews), viewerUid);
};

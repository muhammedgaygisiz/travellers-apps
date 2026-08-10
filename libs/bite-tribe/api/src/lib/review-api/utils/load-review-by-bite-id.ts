import { Review } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION, REVIEW_COLLECTION } from '../../utils/constants';
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
    const displayName = review.authorId
      ? displayNames.get(review.authorId)
      : undefined;

    return displayName ? { ...review, author: displayName } : review;
  });
};

export const loadReviewsByBiteId = async (
  biteId: string,
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

  const reviews = reviewDocs.snapshots.map(
    (reviewDoc) =>
      ({
        ...reviewDoc.data,
        id: reviewDoc.id,
      }) as Review,
  );

  return withResolvedAuthors(reviews);
};

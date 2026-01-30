import { Review } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION, REVIEW_COLLECTION } from '../../utils/constants';

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

  return reviewDocs.snapshots.map(
    (reviewDoc) =>
      ({
        ...reviewDoc.data,
      }) as Review,
  );
};

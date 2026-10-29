import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from '../../utils/constants';

/**
 * Whether the user has posted any Bite, read as a single document instead of
 * loading them all as `loadBitesByUser` does.
 */
export const hasBitesByUser = async (uid: string): Promise<boolean> => {
  const result = await FirebaseFirestore.getCollection({
    reference: BITE_COLLECTION,
    compositeFilter: {
      type: 'and',
      queryConstraints: [
        {
          type: 'where',
          fieldPath: 'userId',
          opStr: '==',
          value: uid,
        },
      ],
    },
    queryConstraints: [{ type: 'limit', limit: 1 }],
  });

  return result.snapshots.length > 0;
};

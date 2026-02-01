import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bucketlist } from 'model';
import { BUCKETLIST_COLLECTION } from '../../utils/constants';

export const loadBucketlistsByUserId = async (
  userId: string,
): Promise<Bucketlist[]> => {
  const data = await FirebaseFirestore.getCollection({
    reference: BUCKETLIST_COLLECTION,
    compositeFilter: {
      type: 'and',
      queryConstraints: [
        {
          type: 'where',
          fieldPath: 'userId',
          opStr: '==',
          value: userId,
        },
      ],
    },
  });

  const bucketlists: Bucketlist[] = data.snapshots.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data,
      }) as Bucketlist,
  );

  return bucketlists;
};

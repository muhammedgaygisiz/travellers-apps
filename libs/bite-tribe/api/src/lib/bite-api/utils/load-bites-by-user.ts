import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from './constants';
import { toBite } from '../../utils/to-bite';
import { Bite } from 'model';

export const loadBitesByUser = async (user: {
  uid: string;
}): Promise<Bite[]> => {
  const uid = user.uid;

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
  });

  return result.snapshots.map((snapshot) => toBite(snapshot));
};

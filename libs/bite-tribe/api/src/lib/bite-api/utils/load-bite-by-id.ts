import { Bite } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from './constants';
import { toBite } from '../../utils/to-bite';

export const loadBiteById = async (biteId: string): Promise<Bite> => {
  const result = await FirebaseFirestore.getDocument({
    reference: `${BITE_COLLECTION}/${biteId}`,
  });

  return toBite(result.snapshot);
};

import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { USERS_COLLECTION } from '../../utils/user-collection-key';
import { PublicUser } from 'model';

export const loadProfileById = async (userId: string): Promise<PublicUser> => {
  const result = await FirebaseFirestore.getDocument({
    reference: `${USERS_COLLECTION}/${userId}`,
  });

  return result.snapshot.data as PublicUser;
};

import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { PublicUser } from 'model';
import { getDownloadUrlFromFirebaseStorage } from 'utils';
import { USERS_COLLECTION } from '../../utils/user-collection-key';

export const updateProfileWithImagePathFromFirebaseStorage = async (
  photoUrl: string,
  profileWithoutPhotoUrl: Omit<PublicUser, 'photoUrl'> | undefined,
  userId: string,
): Promise<PublicUser> => {
  const downloadUrl = await getDownloadUrlFromFirebaseStorage(photoUrl);

  const data = {
    ...(profileWithoutPhotoUrl || {}),
    photoUrl: downloadUrl,
  } as any;

  await FirebaseFirestore.updateDocument({
    reference: `${USERS_COLLECTION}/${userId}`,
    data,
  });

  return data as PublicUser;
};

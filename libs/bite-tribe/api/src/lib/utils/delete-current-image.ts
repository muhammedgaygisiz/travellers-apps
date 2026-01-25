import { PublicUser } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { USERS_COLLECTION } from './user-collection-key';
import { deleteFileInFirebaseStorage } from '../bite-api/utils/delete-file-in-firebasestorage';

export const deleteCurrentImage = async (user: PublicUser): Promise<void> => {
  const userId = user.userId;

  const docResult = await FirebaseFirestore.getDocument({
    reference: `${USERS_COLLECTION}/${userId}`,
  });

  const imagePath = (docResult.snapshot.data as { photoUrl: string }).photoUrl;

  try {
    await deleteFileInFirebaseStorage(imagePath);
  } catch (error) {
    console.error('Error deleting image from Firebase Storage:', error);
  }
};

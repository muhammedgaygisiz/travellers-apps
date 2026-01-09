import { storagePathFromDownloadUrl } from 'utils';
import { FirebaseStorage } from '@capacitor-firebase/storage';

export const deleteFileInFirebaseStorage = async (
  imagePathInFirestore: string,
): Promise<void> => {
  const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);

  await FirebaseStorage.deleteFile({
    path: imagePath,
  });
};

import { Bite } from 'model';
import { storagePathFromDownloadUrl } from 'utils';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { uploadImageAndUpdateBite } from './upload-image-and-update-bite';
export const replaceImageInFirestoreStorage = async (
  isWeb: boolean,
  imageBase64: string,
  imagePathInFirestore: string,
  biteId: string,
  biteWithoutImage: Omit<Bite, 'image'>,
): Promise<void> => {
  const imagePath = storagePathFromDownloadUrl(imagePathInFirestore);

  await FirebaseStorage.deleteFile({ path: imagePath });

  await uploadImageAndUpdateBite(isWeb, imageBase64, biteId, biteWithoutImage);
};

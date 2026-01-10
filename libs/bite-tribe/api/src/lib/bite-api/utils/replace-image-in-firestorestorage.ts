import { Bite } from 'model';
import { uploadImageAndUpdateBite } from './upload-image-and-update-bite';
import { deleteFileInFirebaseStorage } from './delete-file-in-firebasestorage';

export const replaceImageInFirestoreStorage = async (
  isWeb: boolean,
  imageBase64: string,
  imagePathInFirestore: string,
  biteId: string,
  biteWithoutImage: Omit<Bite, 'image'>,
): Promise<void> => {
  await deleteFileInFirebaseStorage(imagePathInFirestore);

  await uploadImageAndUpdateBite(isWeb, imageBase64, biteId, biteWithoutImage);
};

import { Bite } from 'model';
import { uploadImageAndUpdateBite } from './upload-image-and-update-bite';
import { deleteFileInFirebaseStorage } from './delete-file-in-firebasestorage';

export const replaceImageInFirestoreStorage = async (
  imageBase64: string,
  imagePathInFirestore: string,
  biteId: string,
  biteWithoutImage: Omit<Bite, 'image'>,
): Promise<void> => {
  await deleteFileInFirebaseStorage(imagePathInFirestore);

  await uploadImageAndUpdateBite({
    imageBase64,
    biteId,
    biteWithoutImage,
  });
};

import { Bite } from 'model';
import { uploadBase64ToFirebaseStorage } from './upload-base64-to-firebase-storage';
import { updateBiteWithImagePathFromFirestorage } from './update-bite-with-image-path-from-firestorage';

export const uploadImageAndUpdateBite = async (
  isWeb: boolean,
  imageBase64: string,
  biteId: string,
  biteWithoutImage?: Omit<Bite, 'image'>,
  clearBase64Image = false,
): Promise<void> => {
  const imagePath = await uploadBase64ToFirebaseStorage(
    isWeb,
    imageBase64,
    biteId,
  );

  await updateBiteWithImagePathFromFirestorage(
    imagePath,
    biteWithoutImage,
    clearBase64Image,
    biteId,
  );
};

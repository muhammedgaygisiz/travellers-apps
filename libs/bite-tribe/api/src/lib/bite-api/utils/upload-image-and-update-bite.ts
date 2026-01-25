import { Bite } from 'model';
import { updateBiteWithImagePathFromFirestorage } from './update-bite-with-image-path-from-firestorage';
import { uploadBase64ToFirebaseStorage } from '../../utils/upload-base64-to-firebase-storage';

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

import { Bite } from 'model';
import { uploadImageToFirebaseStorage } from './upload-image-to-firebasestorage';
import { updateBiteWithImagePathFromFirestorage } from './update-bite-with-image-path-from-firestorage';

export const uploadImageAndUpdateBite = async (
  isWeb: boolean,
  imageBase64: string,
  biteId: string,
  biteWithoutImage?: Omit<Bite, 'image'>,
  clearBase64Image = false,
): Promise<void> => {
  const imagePath = await uploadImageToFirebaseStorage(
    isWeb,
    imageBase64,
    biteId,
  );

  console.log('image uploaded to path:', imagePath);

  const updatedBite = await updateBiteWithImagePathFromFirestorage(
    imagePath,
    biteWithoutImage,
    clearBase64Image,
    biteId,
  );

  console.log('updatedBite:', updatedBite);
};

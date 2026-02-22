import { Bite, CreateAndUploadImageCallbackParams } from 'model';
import { updateBiteWithImagePathFromFirestorage } from './update-bite-with-image-path-from-firestorage';
import { uploadBase64ToFirebaseStorage } from '../../utils/upload-base64-to-firebase-storage';

type Params = {
  imageBase64: string;
  biteId: string;
  biteWithoutImage?: Omit<Bite, 'image'>;
  clearBase64Image?: boolean;
  callbackFn?: (p: CreateAndUploadImageCallbackParams) => void;
};

export const uploadImageAndUpdateBite = async ({
  imageBase64,
  biteId,
  biteWithoutImage,
  clearBase64Image = false,
  callbackFn,
}: Params): Promise<Bite> => {
  const imagePath = await uploadBase64ToFirebaseStorage({
    base64: imageBase64,
    docId: biteId,
    callbackFn,
  });

  return await updateBiteWithImagePathFromFirestorage(
    imagePath,
    biteWithoutImage,
    clearBase64Image,
    biteId,
  );
};

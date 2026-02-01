import { Bite, CreateAndUploadBiteCallbackParams, UploadParams } from 'model';
import { updateBiteWithImagePathFromFirestorage } from './update-bite-with-image-path-from-firestorage';
import { uploadBase64ToFirebaseStorage } from '../../utils/upload-base64-to-firebase-storage';

type Params = {
  isWeb: boolean;
  imageBase64: string;
  biteId: string;
  biteWithoutImage?: Omit<Bite, 'image'>;
  clearBase64Image?: boolean;
  callbackFn?: (p: CreateAndUploadBiteCallbackParams) => void;
};

export const uploadImageAndUpdateBite = async ({
  isWeb,
  imageBase64,
  biteId,
  biteWithoutImage,
  clearBase64Image = false,
  callbackFn,
}: Params): Promise<void> => {
  const imagePath = await uploadBase64ToFirebaseStorage({
    isWeb,
    base64: imageBase64,
    docId: biteId,
    callbackFn,
  });

  await updateBiteWithImagePathFromFirestorage(
    imagePath,
    biteWithoutImage,
    clearBase64Image,
    biteId,
  );
};

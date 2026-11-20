import { Bite, CreateAndUploadImageCallbackParams } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { uploadBase64ToFirebaseStorage } from '../../utils/upload-base64-to-firebase-storage';
import { BITE_COLLECTION } from '../../utils/constants';
import { withoutPublishedImageFields } from './without-published-image-fields';

type Params = {
  imageBase64: string;
  biteId: string;
  biteWithoutImage?: Omit<Bite, 'image'>;
  clearBase64Image?: boolean;
  callbackFn?: (p: CreateAndUploadImageCallbackParams) => void;
};

/**
 * Uploads a Bite's new photo and saves the rest of the edit with it.
 *
 * The photo's URL is not written here. `setBiteImagePathOnUpload` writes it
 * once the image check has passed the upload, and is its only writer, so a
 * refused photo's URL never reaches a document another member can read
 * (GitHub issue #2139).
 */
export const uploadImageAndUpdateBite = async ({
  imageBase64,
  biteId,
  biteWithoutImage,
  clearBase64Image = false,
  callbackFn,
}: Params): Promise<void> => {
  await uploadBase64ToFirebaseStorage({
    base64: imageBase64,
    docId: biteId,
    callbackFn,
  });

  const data: Partial<Bite> = withoutPublishedImageFields(
    biteWithoutImage ?? {},
  );

  if (clearBase64Image) {
    data.image = '';
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  await FirebaseFirestore.updateDocument({
    reference: `${BITE_COLLECTION}/${biteId}`,
    data,
  });
};

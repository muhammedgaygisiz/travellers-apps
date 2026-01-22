import { dataUrlToBlob, guessExtFromContentType } from 'utils';
import { BITE_COLLECTION } from './constants';
import { uploadBlobToFirebaseStorage } from './uploadBlobToFirebaseStorage';

export const uploadBase64ToFirebaseStorage = async (
  isWeb: boolean,
  base64: string,
  docId: string,
  collection = BITE_COLLECTION,
): Promise<string> => {
  const { blob, contentType } = await dataUrlToBlob(base64);
  const ext = guessExtFromContentType(contentType);

  return await uploadBlobToFirebaseStorage(
    collection,
    docId,
    ext,
    blob,
    contentType,
    isWeb,
  );
};

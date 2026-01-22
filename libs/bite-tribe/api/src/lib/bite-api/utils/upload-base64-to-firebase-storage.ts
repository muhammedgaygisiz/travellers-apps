import { dataUrlToBlob, guessExtFromContentType } from 'utils';
import { BITE_COLLECTION } from './constants';
import { uploadBlobToFirebasestorage } from './upload-blob-to-firebasestorage';

export const uploadBase64ToFirebaseStorage = async (
  isWeb: boolean,
  base64: string,
  docId: string,
  collection = BITE_COLLECTION,
): Promise<string> => {
  const { blob, contentType } = await dataUrlToBlob(base64);
  const ext = guessExtFromContentType(contentType);

  return uploadBlobToFirebasestorage(
    collection,
    docId,
    ext,
    blob,
    contentType,
    isWeb,
  );
};

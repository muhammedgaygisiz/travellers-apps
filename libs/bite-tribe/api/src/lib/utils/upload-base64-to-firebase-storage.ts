import { dataUrlToBlob, guessExtFromContentType } from 'utils';
import { BITE_COLLECTION } from './constants';
import { uploadBlobToFirebasestorage } from './upload-blob-to-firebasestorage';
import { CreateAndUploadBiteCallbackParams } from 'model';

type Params = {
  base64: string;
  docId: string;
  collection?: string;
  callbackFn?: (p: CreateAndUploadBiteCallbackParams) => void;
};

export const uploadBase64ToFirebaseStorage = async ({
  base64,
  docId,
  collection = BITE_COLLECTION,
  callbackFn,
}: Params): Promise<string> => {
  const { blob, contentType } = await dataUrlToBlob(base64);
  const ext = guessExtFromContentType(contentType);

  return uploadBlobToFirebasestorage({
    collection,
    docId,
    extension: ext,
    blob,
    contentType,
    callbackFn,
  });
};

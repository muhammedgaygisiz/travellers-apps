import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { writeBlobToFileSystem } from './write-blob-to-file-system';
import { v4 as uuidv4 } from 'uuid';
import { CreateAndUploadBiteCallbackParams } from 'model';

const uploadToFirebase = (
  fileUploadOptions: UploadFileOptions,
  callbackFn?: (p: CreateAndUploadBiteCallbackParams) => void,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    FirebaseStorage.uploadFile(fileUploadOptions, (evt, err) => {
      if (callbackFn) {
        callbackFn({ uploadParams: { evt, err } });
      }

      if (err) {
        reject(err);
        return;
      }

      if (evt?.completed) {
        resolve(fileUploadOptions.path);
        return;
      }
    });
  });
};

type Params = {
  collection: string;
  docId: string;
  extension: string;
  blob: Blob;
  contentType: string;
  isWeb: boolean;
  callbackFn?: (p: CreateAndUploadBiteCallbackParams) => void;
};

export const uploadBlobToFirebasestorage = async ({
  collection,
  docId,
  extension,
  blob,
  contentType,
  isWeb,
  callbackFn,
}: Params): Promise<string> => {
  const imageId = uuidv4();
  const imagePath = `images/${collection}/${docId}/${imageId}.${extension}`;

  const fileUploadOptions: UploadFileOptions = {
    path: imagePath,
    blob,
    metadata: {
      contentType: contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    },
  };

  if (isWeb) {
    return await uploadToFirebase(fileUploadOptions, callbackFn);
  }

  const fileName = `${imageId}.${extension}`;
  const writeFileResult = await writeBlobToFileSystem(blob, fileName);
  fileUploadOptions.uri = writeFileResult.uri;

  return await uploadToFirebase(fileUploadOptions, callbackFn);
};

import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { writeBlobToFileSystem } from './write-blob-to-file-system';
import { v4 as uuidv4 } from 'uuid';
import { CreateAndUploadImageCallbackParams } from 'model';
import { localImageFileName } from './local-image-file';
import { Capacitor } from '@capacitor/core';

const uploadToFirebase = (
  fileUploadOptions: UploadFileOptions,
  callbackFn?: (p: CreateAndUploadImageCallbackParams) => void,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    FirebaseStorage.uploadFile(fileUploadOptions, (evt, err) => {
      if (callbackFn) {
        callbackFn({
          uploadParams: {
            evt,
            err,
            offlineImagePath: fileUploadOptions.uri || '',
          },
          imagePath: fileUploadOptions.path,
        });
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
  callbackFn?: (p: CreateAndUploadImageCallbackParams) => void;
};

export const uploadBlobToFirebasestorage = async ({
  collection,
  docId,
  extension,
  blob,
  contentType,
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

  // Local copy is named after the document so it can be found again from the id
  // alone (see local-image-file.ts); the Storage object keeps the UUID above.
  const fileName = localImageFileName(collection, docId, extension);

  try {
    const writeFileResult = await writeBlobToFileSystem(blob, fileName);
    fileUploadOptions.uri = writeFileResult.uri;
  } catch (error) {
    // The native plugin uploads from a file URI and has nothing to send without
    // one, so there the write is load-bearing and the failure has to travel. On
    // web the blob above is the upload, and the copy only feeds the local
    // gallery - losing a cache entry must not cost the user their photo.
    if (Capacitor.isNativePlatform()) {
      throw error;
    }

    console.error(`Error keeping a local copy of ${fileName}:`, error);
  }

  await uploadToFirebase(fileUploadOptions, callbackFn);
  return imagePath;
};

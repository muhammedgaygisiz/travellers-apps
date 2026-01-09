import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { dataUrlToBlob, guessExtFromContentType } from 'utils';
import { v4 as uuidv4 } from 'uuid';
import { BITE_COLLECTION } from './constants';
import { writeBlobToFileSystem } from './write-blob-to-file-system';

const uploadWithWeb = (
  fileUploadOptions: UploadFileOptions,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    FirebaseStorage.uploadFile(fileUploadOptions, (evt, err) => {
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

const uploadWithNative = (
  fileUploadOptions: UploadFileOptions,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    FirebaseStorage.uploadFile(fileUploadOptions, (evt, err) => {
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

export const uploadImageToFirebaseStorage = async (
  isWeb: boolean,
  imageBase64: string,
  biteId: string,
): Promise<string> => {
  const { blob, contentType } = await dataUrlToBlob(imageBase64);
  const ext = guessExtFromContentType(contentType);

  const imageId = uuidv4();
  const imagePath = `images/${BITE_COLLECTION}/${biteId}/${imageId}.${ext}`;

  const fileUploadOptions: UploadFileOptions = {
    path: imagePath,
    blob,
    metadata: {
      contentType: contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    },
  };

  if (isWeb) {
    return await uploadWithWeb(fileUploadOptions);
  }

  const fileName = `${imageId}.${ext}`;
  const writeFileResult = await writeBlobToFileSystem(blob, fileName);
  fileUploadOptions.uri = writeFileResult.uri;

  return await uploadWithNative(fileUploadOptions);
};

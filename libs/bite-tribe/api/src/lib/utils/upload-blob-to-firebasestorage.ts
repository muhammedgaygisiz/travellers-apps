import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { writeBlobToFileSystem } from './write-blob-to-file-system';
import { v4 as uuidv4 } from 'uuid';

const uploadToFirebase = (
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

export const uploadBlobToFirebasestorage = async (
  collection: string,
  docId: string,
  ext: string,
  blob: Blob,
  contentType: string,
  isWeb: boolean,
): Promise<string> => {
  const imageId = uuidv4();
  const imagePath = `images/${collection}/${docId}/${imageId}.${ext}`;

  const fileUploadOptions: UploadFileOptions = {
    path: imagePath,
    blob,
    metadata: {
      contentType: contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    },
  };

  if (isWeb) {
    return await uploadToFirebase(fileUploadOptions);
  }

  const fileName = `${imageId}.${ext}`;
  const writeFileResult = await writeBlobToFileSystem(blob, fileName);
  fileUploadOptions.uri = writeFileResult.uri;

  return await uploadToFirebase(fileUploadOptions);
};

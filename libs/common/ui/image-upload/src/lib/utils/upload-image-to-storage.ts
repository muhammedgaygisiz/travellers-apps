import {
  FirebaseStorage,
  UploadFileOptions,
} from '@capacitor-firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { dataUrlToBlob, guessExtFromContentType } from 'utils';
import { Platform } from '@ionic/angular';

const toBase64FromBlob = async (blob: Blob): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (): void => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (event): void =>
      reject(new Error(`Failed to read blob as base64: ${event}`));
    reader.readAsDataURL(blob);
  });

const writeToFilesystem = async (
  blob: Blob,
  fileName: string,
): Promise<string> => {
  const base64 = await toBase64FromBlob(blob);
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Documents,
  });
  return result.uri;
};

const uploadBlobToStorage = (options: UploadFileOptions): Promise<void> =>
  new Promise((resolve, reject) => {
    FirebaseStorage.uploadFile(options, (evt, err) => {
      if (err) {
        reject(err);
        return;
      }
      if (evt?.completed) {
        resolve();
        return;
      }
    });
  });

export const uploadImageToStorage = async (
  base64: string,
  platform: Platform,
): Promise<string> => {
  const { blob, contentType } = await dataUrlToBlob(base64);
  const ext = guessExtFromContentType(contentType);
  const imageId = uuidv4();
  const imagePath = `images/uploads/${imageId}.${ext}`;

  const uploadOptions: UploadFileOptions = {
    path: imagePath,
    blob,
    metadata: {
      contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    },
  };

  if (platform.is('hybrid')) {
    const fileName = `${imageId}.${ext}`;
    uploadOptions.uri = await writeToFilesystem(blob, fileName);
  }

  await uploadBlobToStorage(uploadOptions);

  return new Promise((resolve, reject) => {
    FirebaseStorage.getDownloadUrl({ path: imagePath })
      .then((result) => resolve(result.downloadUrl))
      .catch(reject);
  });
};

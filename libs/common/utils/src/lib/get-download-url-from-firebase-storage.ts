import { FirebaseStorage } from '@capacitor-firebase/storage';

export const getDownloadUrlFromFirebaseStorage = async (
  objectPath: string,
): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    FirebaseStorage.getDownloadUrl({
      path: objectPath,
    })
      .then((result) => resolve(result.downloadUrl))
      .catch((e) => {
        console.warn(`Failed to get download url from FirebaseStorage: ${e}`);
        reject(e);
      });
  });
};

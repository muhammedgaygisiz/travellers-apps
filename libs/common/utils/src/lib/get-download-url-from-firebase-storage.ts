import { FirebaseStorage } from '@capacitor-firebase/storage';

export const getDownloadUrlFromFirebaseStorage = async (
  objectPath: string
): Promise<string | undefined> => {
  try {
    const result = await FirebaseStorage.getDownloadUrl({
      path: objectPath,
    });

    return result.downloadUrl;
  } catch (e) {
    console.warn(`Failed to get download url from FirebaseStorage: ${e}`);
    return undefined;
  }
};

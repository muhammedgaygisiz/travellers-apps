import { getStorage } from 'firebase-admin/storage';

type FileMetadata = { metadata?: object | undefined };

const normalizeStorageDownloadToken = (rawToken?: string): string | undefined =>
  rawToken
    ?.split(',')
    .map((token) => token.trim())
    .filter(Boolean)[0];

const getToken = (metadata: FileMetadata): string | undefined =>
  normalizeStorageDownloadToken(
    (metadata.metadata as Record<string, string> | undefined)
      ?.firebaseStorageDownloadTokens,
  );

/**
 * The download URL the client SDK would produce for a Storage object, built
 * from the download token Storage adds to its metadata.
 *
 * Under the Storage emulator, FIREBASE_STORAGE_EMULATOR_HOST is set (for
 * example "localhost:9199") and the URL points there, so it resolves locally.
 */
export const storageDownloadUrl = async (
  bucket: string,
  objectPath: string,
): Promise<string> => {
  const file = getStorage().bucket(bucket).file(objectPath);
  const [metadata] = await file.getMetadata();
  const token = getToken(metadata);

  const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const storageBaseUrl = storageEmulatorHost
    ? `http://${storageEmulatorHost}`
    : 'https://firebasestorage.googleapis.com';

  const encodedPath = encodeURIComponent(objectPath);

  return token
    ? `${storageBaseUrl}/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${token}`
    : `${storageBaseUrl}/v0/b/${bucket}/o/${encodedPath}?alt=media`;
};

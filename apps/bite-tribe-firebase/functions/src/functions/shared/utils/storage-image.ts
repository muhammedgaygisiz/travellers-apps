import { getStorage } from 'firebase-admin/storage';
import type { GeminiImage } from './gemini';

/** The largest base64 photo a model is handed: the app sends 768 px ones. */
export const MAX_IMAGE_BASE64_LENGTH = 2_000_000;

/**
 * The Storage path of one of our own download URLs, or nothing. Only our
 * bucket is read, through the Admin SDK, so a URL cannot make a function
 * fetch anything else (issue #2030).
 */
export const storagePathOf = (
  value: unknown,
  bucket: string,
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const url = new URL(value);
    const prefix = `/v0/b/${bucket}/o/`;

    if (
      url.hostname !== 'firebasestorage.googleapis.com' ||
      !url.pathname.startsWith(prefix)
    ) {
      return undefined;
    }

    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return undefined;
  }
};

/**
 * Reads a photo from our own bucket for a model, by its Storage path. Nothing
 * when there is no path or the photo is too large to send.
 */
export const imageFromStoragePath = async (
  path: string | undefined,
): Promise<GeminiImage | undefined> => {
  if (!path) {
    return undefined;
  }

  const [buffer] = await getStorage().bucket().file(path).download();

  return buffer.length * 1.37 > MAX_IMAGE_BASE64_LENGTH
    ? undefined
    : { mimeType: 'image/jpeg', data: buffer.toString('base64') };
};

/** Reads a photo from our own bucket for a model, by its download URL. */
export const imageFromStorageUrl = async (
  value: unknown,
): Promise<GeminiImage | undefined> =>
  imageFromStoragePath(storagePathOf(value, getStorage().bucket().name));

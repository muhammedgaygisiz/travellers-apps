import { Filesystem } from '@capacitor/filesystem';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

const contentTypeFor = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  return CONTENT_TYPE_BY_EXTENSION[extension] ?? 'image/jpeg';
};

/**
 * Reads a locally stored image back into the data URL shape the upload path
 * expects.
 *
 * The upload takes base64 because that is what the create-Bite form produces;
 * a retry starts from a file on disk instead, so it is read back and wrapped
 * the same way. The content type comes from the file name because
 * `Filesystem.readFile` reports none. See GitHub issue #1168.
 */
export const readLocalImageAsDataUrl = async (
  fileUri: string,
): Promise<string> => {
  const { data } = await Filesystem.readFile({ path: fileUri });

  // Native returns a base64 string; the web implementation returns a Blob.
  const base64 =
    typeof data === 'string' ? data : await blobToBase64(data as Blob);

  return `data:${contentTypeFor(fileUri)};base64,${base64}`;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = (): void => reject(reader.error);
    reader.onloadend = (): void => {
      const result = String(reader.result);

      resolve(result.slice(result.indexOf(',') + 1));
    };

    reader.readAsDataURL(blob);
  });

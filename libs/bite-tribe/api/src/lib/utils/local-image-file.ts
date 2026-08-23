import { Filesystem } from '@capacitor/filesystem';
import { LOCAL_IMAGE_DIRECTORY, localImageDirectory } from 'utils';

/**
 * Deterministic on-device filename for the local copy of an uploaded image.
 *
 * Naming the local copy after the owning document (instead of a random UUID)
 * makes it findable again from the id alone — no external bookkeeping needed —
 * and means a re-upload overwrites the same file instead of leaking a new one
 * per attempt. The Storage object keeps its own UUID name; only this temp copy
 * is derived from the id.
 */
export const localImageFileName = (
  collection: string,
  docId: string,
  extension: string,
): string => `${collection}_${docId}.${extension}`;

const localImageFilePrefix = (collection: string, docId: string): string =>
  `${collection}_${docId}.`;

export type LocalImageFile = { name: string; uri: string };

/**
 * Finds the local copy previously written for a document, if it still exists.
 * Returns the most recently modified match (extensions can differ between
 * uploads), or `undefined` when no local copy is present.
 *
 * Only the signed-in user's own directory is searched, so a copy another
 * account left on this device is not found. See GitHub issue #1328.
 */
export const findLocalUploadedImage = async (
  collection: string,
  docId: string,
): Promise<LocalImageFile | undefined> => {
  const prefix = localImageFilePrefix(collection, docId);

  try {
    const path = await localImageDirectory();

    if (!path) {
      return undefined;
    }

    const { files } = await Filesystem.readdir({
      path,
      directory: LOCAL_IMAGE_DIRECTORY,
    });

    const match = files
      .filter((file) => file.type === 'file' && file.name.startsWith(prefix))
      .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))[0];

    if (!match) {
      return undefined;
    }

    return { name: match.name, uri: match.uri };
  } catch {
    return undefined;
  }
};

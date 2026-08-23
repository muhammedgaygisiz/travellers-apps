import { Filesystem, WriteFileResult } from '@capacitor/filesystem';
import { LOCAL_IMAGE_DIRECTORY, localImagePath } from 'utils';
import { toBase64 } from './to-base-64';

export const writeBlobToFileSystem = async (
  blob: Blob,
  fileName: string,
): Promise<WriteFileResult> => {
  // The copy belongs to whoever is signed in, not to the device. See GitHub
  // issue #1328 and `localImageDirectory`.
  const path = await localImagePath(fileName);

  if (!path) {
    throw new Error(
      `Cannot keep a local copy of ${fileName} while no user is signed in.`,
    );
  }

  const base64Data = await toBase64(blob);

  return await Filesystem.writeFile({
    path,
    data: base64Data,
    directory: LOCAL_IMAGE_DIRECTORY,
    recursive: true,
  });
};

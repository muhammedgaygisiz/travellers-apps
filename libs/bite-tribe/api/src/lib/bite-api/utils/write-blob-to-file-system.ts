import { Directory, Filesystem, WriteFileResult } from '@capacitor/filesystem';
import { toBase64 } from '../../utils/to-base-64';

export const writeBlobToFileSystem = async (
  blob: Blob,
  fileName: string,
): Promise<WriteFileResult> => {
  const base64Data = await toBase64(blob);

  return await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Cache,
  });
};

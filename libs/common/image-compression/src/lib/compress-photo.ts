import { Photo } from '@capacitor/camera';
import { compressWithCanvas } from './compress-with-canvas';
import { base64ToFile } from './base64-to-file';

const toFile = (photo: Photo) => {
  return base64ToFile(
    `data:image/${photo.format};base64,${photo.base64String}`,
    'photo.jpg'
  );
};

const MAX_SIZE_BYTES = 800 * 1024; // 800 KB

export const compressPhoto = async (
  photo: Photo,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<File> => {
  let file = toFile(photo);
  let quality = 0.7;
  let width = maxWidth;
  let height = maxHeight;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = blobUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      file = await new Promise((resolve) => {
        compressWithCanvas(img, file, width, height, resolve as any, quality);
      });

      if (
        file.size <= MAX_SIZE_BYTES ||
        (width < 512 && height < 512 && quality <= 0.5)
      ) {
        break;
      }

      // Reduce quality and dimensions for next iteration
      quality -= 0.1;
      width = Math.floor(width * 0.9);
      height = Math.floor(height * 0.9);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  return file;
};

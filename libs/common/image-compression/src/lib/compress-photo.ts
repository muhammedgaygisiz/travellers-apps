import { Photo } from '@capacitor/camera';
import { compressWithCanvas } from './compress-with-canvas';
import { base64ToFile } from './base64-to-file';

const toFile = (photo: Photo): File => {
  return base64ToFile(
    `data:image/${photo.format};base64,${photo.base64String}`,
    'photo.jpg'
  );
};

const MAX_SIZE_BYTES = 800 * 1024; // 800 KB
const MAX_ITERATIONS = 10;

export const compressPhoto = async (
  photo: Photo,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<File> => {
  let file = toFile(photo);
  let quality = 0.7;
  let width = maxWidth;
  let height = maxHeight;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = blobUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = (): void => resolve();
        img.onerror = reject;
      });

      const currentQuality = Math.max(0.1, quality);
      file = await new Promise((resolve) => {
        compressWithCanvas(
          img,
          file.name,
          width,
          height,
          resolve as any,
          currentQuality
        );
      });

      if (
        file.size <= MAX_SIZE_BYTES ||
        (width < 512 && height < 512 && quality <= 0.1)
      ) {
        break;
      }

      // Reduce quality and dimensions for next iteration
      quality = Math.max(0.1, quality - 0.1);
      width = Math.floor(width * 0.9);
      height = Math.floor(height * 0.9);
      iterations++;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  return file;
};

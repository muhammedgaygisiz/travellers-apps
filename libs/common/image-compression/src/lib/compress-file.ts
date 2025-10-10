import { compressWithCanvas } from './compress-with-canvas';
import { convertHeicToJpeg } from './convert-heic-to-jpeg';

const isHeic = (file: File): boolean => {
  return /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
};

const compress = (
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<File> =>
  new Promise((resolve) => {
    const blobURL = URL.createObjectURL(file);
    const img = new Image();
    img.src = blobURL;

    img.onload = (): void =>
      compressWithCanvas(
        img,
        file.name,
        maxWidth,
        maxHeight,
        resolve as any,
        0.7
      );

    img.onerror = (): void => {
      return resolve({} as any);
    };
  });

export const compressFile = async (
  file: File,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<File> => {
  if (isHeic(file)) {
    const convertedHeic2JpegFile = await convertHeicToJpeg(file);

    return compress(convertedHeic2JpegFile, maxWidth, maxHeight);
  }

  return compress(file, maxWidth, maxHeight);
};

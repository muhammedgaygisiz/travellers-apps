import { compressWithCanvas } from './compress-with-canvas';
import heic2any from 'heic2any';

const isHeic = (file: File): boolean => {
  return /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
};

const convertHeicToJpeg = async (file: File): Promise<File> => {
  const jpegBlob = (await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.7,
  })) as Blob;

  const outName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([jpegBlob], outName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
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
      return resolve(file);
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

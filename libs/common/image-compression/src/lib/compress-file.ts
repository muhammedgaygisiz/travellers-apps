import { compressWithCanvas } from './compress-with-canvas';

export const compressFile = (
  file: any,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<File> => {
  return new Promise((resolve) => {
    const blobURL = URL.createObjectURL(file);
    const img = new Image();
    img.src = blobURL;

    img.onload = () =>
      compressWithCanvas(img, file, maxWidth, maxHeight, resolve as any);

    img.onerror = () => {
      console.log('shit happens');

      return resolve({} as any);
    };
  });
};

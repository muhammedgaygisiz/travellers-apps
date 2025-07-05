import { compressWithCanvas } from './compress-with-canvas';

export const compressFile = (
  file: File,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<File> => {
  return new Promise((resolve) => {
    const blobURL = URL.createObjectURL(file);
    const img = new Image();
    img.src = blobURL;

    img.onload = () =>
      compressWithCanvas(
        img,
        file.name,
        maxWidth,
        maxHeight,
        resolve as any,
        0.7
      );

    img.onerror = () => {
      console.log('shit happens');

      return resolve({} as any);
    };
  });
};

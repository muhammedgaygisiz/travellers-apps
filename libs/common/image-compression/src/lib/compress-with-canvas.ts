import { resizeRetainingAspectRatio } from './resize-retaining-aspect-ratio';

export const compressWithCanvas = (
  img: HTMLImageElement,
  file: any,
  maxWidth: number,
  maxHeight: number,
  // eslint-disable-next-line no-unused-vars
  resolve: (value: File | PromiseLike<File>) => void,
  quality: number
): void => {
  const MIME_TYPE = 'image/jpeg';

  URL.revokeObjectURL(img.src);
  const [newWidth, newHeight] = resizeRetainingAspectRatio(
    img,
    maxWidth,
    maxHeight
  );
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, newWidth, newHeight);
  let newFile: File;
  canvas.toBlob(
    (blob) => {
      if (blob) {
        newFile = new File([blob], file.name, { type: MIME_TYPE });
        return resolve(newFile);
      }
      return resolve({} as any);
    },
    MIME_TYPE,
    quality
  );
};

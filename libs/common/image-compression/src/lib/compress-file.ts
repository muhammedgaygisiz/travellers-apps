const resizeRetainingAspectRatio = (
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): [number, number] => {
  let newWidth = img.width;
  let newHeight = img.height;

  if (newWidth > maxWidth) {
    newHeight = Math.round((newHeight * maxWidth) / newWidth);
    newWidth = maxWidth;
  }

  if (newHeight > maxHeight) {
    newWidth = Math.round((newWidth * maxHeight) / newHeight);
    newHeight = maxHeight;
  }

  return [newWidth, newHeight];
};

const compressWithCanvas = (
  img: HTMLImageElement,
  file: any,
  maxWidth: number,
  maxHeight: number,
  // eslint-disable-next-line no-unused-vars
  resolve: (value: File | PromiseLike<File>) => void
): void => {
  const MIME_TYPE = 'image/jpeg';
  const QUALITY = 0.7;

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
    QUALITY
  );
};

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

import { Photo } from '@capacitor/camera';
import { compressWithCanvas } from './compress-with-canvas';

function base64ToFile(base64: string | undefined = '', format: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], `file.${format}`, { type: mime });
}

const toFile = (photo: Photo) => {
  return base64ToFile(
    `data:image/${photo.format};base64,${photo.base64String}`,
    'photo.jpg'
  );
};

export const compressPhoto = (
  photo: Photo,
  maxWidth = 2048,
  maxHeight = 2048
): Promise<File> => {
  const file = toFile(photo);

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

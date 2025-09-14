import { base64ToFile } from './base64-to-file';

export const extractFileFromHtmlImageElement = (
  elem: HTMLImageElement
): File => {
  const canvas = document.createElement('canvas');
  canvas.width = elem.naturalWidth;
  canvas.height = elem.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(elem, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');

  return base64ToFile(dataUrl);
};

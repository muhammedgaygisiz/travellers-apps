export const resizeRetainingAspectRatio = (
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

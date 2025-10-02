export const computeSnapOffsets = (snapPixels: number[]): number[] => {
  const windowInnerHeight = window.innerHeight;
  return snapPixels.map((snapPixel) => windowInnerHeight - snapPixel);
};

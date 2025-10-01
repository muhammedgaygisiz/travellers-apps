export const findClosestSnap = (
  snapOffsets: number[],
  value: number
): number => {
  if (!snapOffsets?.length) {
    return value;
  }

  let closest = snapOffsets[0];
  let minDiff = Math.abs(value - closest);
  snapOffsets.forEach((snapOffset) => {
    const diff = Math.abs(value - snapOffset);
    if (diff < minDiff) {
      minDiff = diff;
      closest = snapOffset;
    }
  });
  return closest;
};

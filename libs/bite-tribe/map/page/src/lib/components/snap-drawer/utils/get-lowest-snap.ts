export const getLowestSnap = (snapOffsets: number[]): number =>
  Math.max(...snapOffsets);

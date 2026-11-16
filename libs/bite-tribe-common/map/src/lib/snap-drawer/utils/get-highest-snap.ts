export const getHighestSnap = (snapOffsets: number[]): number =>
  Math.min(...snapOffsets);

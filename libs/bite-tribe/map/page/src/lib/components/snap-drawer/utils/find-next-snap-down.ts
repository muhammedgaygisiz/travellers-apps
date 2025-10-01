import { getLowestSnap } from './get-lowest-snap';

export const findNextSnapDown = (
  snapOffsets: number[],
  currentY: number
): number => {
  const validSnaps = snapOffsets.filter((snap) => snap > currentY);
  return validSnaps.length > 0
    ? Math.min(...validSnaps)
    : getLowestSnap(snapOffsets);
};

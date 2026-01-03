import { findClosestSnap } from '../find-closest-snap';
import { vi } from 'vitest';

const getLowestSnapMock = vi.fn();
vi.mock('../get-lowest-snap', () => ({
  getLowestSnap: (...args: any): void => getLowestSnapMock(...args),
}));

describe('findClosestSnap', () => {
  beforeEach(() => {
    getLowestSnapMock.mockReset();
  });

  it('should return the closest snap point when there are multiple snap points', () => {
    const snapOffsets = [100, 200, 300, 400];
    const currentY = 250;
    const result = findClosestSnap(snapOffsets, currentY);
    expect(result).toBe(200);
  });

  it('should return the current value when there are no snap points', () => {
    const snapOffsets: number[] = [];
    const currentY = 250;
    const result = findClosestSnap(snapOffsets, currentY);
    expect(result).toBe(250);
  });

  it('should return the only snap point when there is a single snap point', () => {
    const snapOffsets = [150];
    const currentY = 250;
    const result = findClosestSnap(snapOffsets, currentY);
    expect(result).toBe(150);
  });

  it('should return the closest snap point when the current value is exactly between two snap points', () => {
    const snapOffsets = [100, 200];
    const currentY = 150;
    const result = findClosestSnap(snapOffsets, currentY);
    expect(result).toBe(100);
  });
});

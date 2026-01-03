import { describe, expect, it } from 'vitest';
import { getLowestSnap } from '../get-lowest-snap';

describe('getLowestSnap', () => {
  it('should return the lowest snap point from the array', () => {
    const snaps = [100, 300, 200, 400];
    const lowest = getLowestSnap(snaps);
    expect(lowest).toBe(400);
  });

  it('should handle negative snap points', () => {
    const snaps = [-100, -300, -200, -400];
    const lowest = getLowestSnap(snaps);
    expect(lowest).toBe(-100);
  });

  it('should return the only snap point if array has one element', () => {
    const snaps = [150];
    const lowest = getLowestSnap(snaps);
    expect(lowest).toBe(150);
  });
});

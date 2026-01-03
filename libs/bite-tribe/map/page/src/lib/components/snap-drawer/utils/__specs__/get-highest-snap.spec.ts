import { describe, expect, it } from 'vitest';
import { getHighestSnap } from '../get-highest-snap';

describe('getHighestSnap', () => {
  it('should return the highest snap point', () => {
    const snaps = [100, 300, 200, 50];
    const result = getHighestSnap(snaps);
    expect(result).toBe(50);
  });

  it('should handle negative snap points', () => {
    const snaps = [-100, -300, -50, -200];
    const result = getHighestSnap(snaps);
    expect(result).toBe(-300);
  });

  it('should return the only snap point if array has one element', () => {
    const snaps = [150];
    const result = getHighestSnap(snaps);
    expect(result).toBe(150);
  });
});

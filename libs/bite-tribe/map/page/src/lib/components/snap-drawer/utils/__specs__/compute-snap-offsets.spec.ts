import { describe, expect, it } from 'vitest';
import { computeSnapOffsets } from '../compute-snap-offsets';

describe('computeSnapOffsets', () => {
  it('should compute snap offsets correctly', () => {
    const snapPixels = [100, 300, 500];
    const windowInnerHeight = window.innerHeight;
    const expectedOffsets = snapPixels.map(
      (snapPixel) => windowInnerHeight - snapPixel,
    );
    const offsets = computeSnapOffsets(snapPixels);
    expect(offsets).toEqual(expectedOffsets);
  });

  it('should return an empty array when given an empty array', () => {
    const snapPixels: number[] = [];
    const offsets = computeSnapOffsets(snapPixels);
    expect(offsets).toEqual([]);
  });
});

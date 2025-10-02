import { findNextSnapDown } from '../find-next-snap-down';

const getLowestSnapMock = jest.fn();
jest.mock('../get-lowest-snap', () => ({
  getLowestSnap: (...args: any): void => getLowestSnapMock(...args),
}));

describe('findNextSnapDown', () => {
  beforeEach(() => {
    getLowestSnapMock.mockReset();
  });

  it('should return the next snap down if available', () => {
    const snaps = [100, 200, 300, 400];
    const currentY = 250;
    const result = findNextSnapDown(snaps, currentY);
    expect(result).toBe(300);
  });

  it('should return the lowest snap if no snap down is available', () => {
    const snaps = [100, 200, 300, 400];
    const currentY = 450;
    getLowestSnapMock.mockReturnValue(100);
    const result = findNextSnapDown(snaps, currentY);
    expect(result).toBe(100);
    expect(getLowestSnapMock).toHaveBeenCalledWith(snaps);
  });

  it('should handle edge case where currentY is exactly a snap point', () => {
    const snaps = [100, 200, 300, 400];
    const currentY = 200;
    const result = findNextSnapDown(snaps, currentY);
    expect(result).toBe(300);
  });

  it('should handle empty snapOffsets array', () => {
    const snaps: number[] = [];
    const currentY = 150;
    getLowestSnapMock.mockReturnValue(undefined);
    const result = findNextSnapDown(snaps, currentY);
    expect(result).toBeUndefined();
    expect(getLowestSnapMock).toHaveBeenCalledWith(snaps);
  });
});

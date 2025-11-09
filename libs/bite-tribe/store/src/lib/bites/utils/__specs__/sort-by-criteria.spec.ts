import { sortByCriteria } from '../sort-by-criteria';
import { Bite } from 'model';

describe('sortByCriteria', () => {
  it('should return empty array if bites is null', () => {
    const result = sortByCriteria(null as unknown as Bite[], 'likes', {});
    expect(result).toEqual([]);
  });

  it('should return empty array if bites is undefined', () => {
    const result = sortByCriteria(undefined as unknown as Bite[], 'likes', {});
    expect(result).toEqual([]);
  });

  it('should return original array if sorting is not provided', () => {
    const bites = [{ id: 1 }, { id: 2 }] as unknown as Bite[];
    const result = sortByCriteria(bites, '', {});
    expect(result).toEqual(bites);
  });

  it('should sort by likes', () => {
    const bites = [
      { id: 1, likes: new Array(5) },
      { id: 2, likes: new Array(10) },
    ] as unknown as Bite[];
    const result = sortByCriteria(bites, 'likes', {});
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });
});

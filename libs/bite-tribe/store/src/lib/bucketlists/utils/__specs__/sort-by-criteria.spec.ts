import { sortByCriteria } from '../sort-by-criteria';

describe('sortByCriteria', () => {
  it('should return empty array when input is undefined', () => {
    const result = sortByCriteria(undefined as any, 'name');
    expect(result).toEqual([]);
  });

  it('should return empty array when input is null', () => {
    const result = sortByCriteria(null as any, 'name');
    expect(result).toEqual([]);
  });

  it('should return the same array when input is empty', () => {
    const result = sortByCriteria([], 'name');
    expect(result).toEqual([]);
  });

  it('should return the same array when sorting criteria is not provided', () => {
    const bucketlists = [{ name: 'A' }, { name: 'B' }];
    const result = sortByCriteria(bucketlists as any, '');
    expect(result).toEqual(bucketlists);
  });
});

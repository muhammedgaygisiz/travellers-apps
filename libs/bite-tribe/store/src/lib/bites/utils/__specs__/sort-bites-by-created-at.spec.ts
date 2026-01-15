import type { Bite } from 'model';
import { sortBitesByCreatedAt } from '../sort-bites-by-created-at';

describe('sortBitesByCreatedAt', () => {
  it('should sort bites by createdAt in descending order', () => {
    const bites = [
      { id: 1, createdAt: '2023-10-01T12:00:00Z' } as unknown as Bite,
      { id: 2, createdAt: '2023-10-02T12:00:00Z' } as unknown as Bite,
      { id: 3, createdAt: '2023-09-30T12:00:00Z' } as unknown as Bite,
    ];

    const sortedBites = sortBitesByCreatedAt(bites);

    expect(sortedBites[0].id).toBe(2);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(3);
  });

  it('should handle bites with missing createdAt when second has missing createdAt', () => {
    const bites = [
      { id: 1, createdAt: '2023-10-01T12:00:00Z' } as unknown as Bite,
      { id: 2 } as unknown as Bite,
      { id: 3, createdAt: '2023-09-30T12:00:00Z' } as unknown as Bite,
    ];

    const sortedBites = sortBitesByCreatedAt(bites);

    expect(sortedBites[0].id).toBe(1);
    expect(sortedBites[1].id).toBe(3);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should handle bites with missing createdAt when first has missing createdAt', () => {
    const bites = [
      { id: 1 } as unknown as Bite,
      { id: 2, createdAt: '2023-10-01T12:00:00Z' } as unknown as Bite,
      { id: 3, createdAt: '2023-09-30T12:00:00Z' } as unknown as Bite,
    ];

    const sortedBites = sortBitesByCreatedAt(bites);

    expect(sortedBites[0].id).toBe(2);
    expect(sortedBites[1].id).toBe(3);
    expect(sortedBites[2].id).toBe(1);
  });

  it('should return an empty array when input is empty', () => {
    const sortedBites = sortBitesByCreatedAt([]);
    expect(sortedBites.length).toBe(0);
  });

  it('should handle bites with no createdAt', () => {
    const bites = [
      { id: 1 } as unknown as Bite,
      { id: 2 } as unknown as Bite,
      { id: 3 } as unknown as Bite,
    ];

    const sortedBites = sortBitesByCreatedAt(bites);

    expect(sortedBites[0].id).toBe(1);
    expect(sortedBites[1].id).toBe(2);
    expect(sortedBites[2].id).toBe(3);
  });

  it('should handle erroneous bites gracefully', () => {
    const bites = [undefined as unknown as Bite, undefined as unknown as Bite];

    const sortedBites = sortBitesByCreatedAt(bites);

    expect(sortedBites).toEqual([undefined, undefined]);
  });
});

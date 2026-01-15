import type { Bite } from 'model';
import { sortBitesByRating } from '../sort-bites-by-rating';

describe('sortBitesByRating', () => {
  it('should sort bites by likes in descending order', () => {
    const bites = [
      { id: 1, rating: 2 } as unknown as Bite,
      { id: 2, rating: 1 } as unknown as Bite,
      { id: 3, rating: 3 } as unknown as Bite,
    ];

    const sortedBites = sortBitesByRating(bites);

    expect(sortedBites[0].id).toBe(3);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should handle bites with no likes', () => {
    const bites = [
      { id: 1, rating: 1 } as unknown as Bite,
      { id: 2 } as unknown as Bite,
      { id: 3, rating: 2 } as unknown as Bite,
    ];

    const sortedBites = sortBitesByRating(bites);

    expect(sortedBites[0].id).toBe(3);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should return an empty array when input is empty', () => {
    const sortedBites = sortBitesByRating([]);
    expect(sortedBites.length).toBe(0);
  });
});

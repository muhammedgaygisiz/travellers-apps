import { sortBitesByDistance } from '../sort-bites-by-distance';

describe('sortBitesByDistance', () => {
  it('should sort bites by distance in ascending order', () => {
    const bites = [
      { id: 1, distance: 10 },
      { id: 2, distance: 5 },
      { id: 3, distance: 20 },
    ];

    const sortedBites = sortBitesByDistance(bites);

    expect(sortedBites[0].id).toBe(2);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(3);
  });

  it('should handle bites with missing distance', () => {
    const bites = [{ id: 1, distance: 10 }, { id: 2 }, { id: 3, distance: 20 }];

    const sortedBites = sortBitesByDistance(bites);

    expect(sortedBites[0].id).toBe(1);
    expect(sortedBites[1].id).toBe(3);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should return an empty array when input is empty', () => {
    const sortedBites = sortBitesByDistance([]);
    expect(sortedBites.length).toBe(0);
  });
});

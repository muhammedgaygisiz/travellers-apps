import { byDistance } from '../by-distance';

describe('byDistance', () => {
  it('should sort bites by distance', () => {
    const bites = [
      { id: 1, distance: 10 },
      { id: 2, distance: 5 },
      { id: 3, distance: 15 },
    ];

    const sortedBites = bites.sort(byDistance);

    expect(sortedBites).toEqual([
      { id: 2, distance: 5 },
      { id: 1, distance: 10 },
      { id: 3, distance: 15 },
    ]);
  });
});

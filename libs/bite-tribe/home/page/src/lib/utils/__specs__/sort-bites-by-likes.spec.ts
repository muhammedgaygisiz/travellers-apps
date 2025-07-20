import { sortBitesByLikes } from '../sort-bites-by-likes';

describe('sortBitesByLikes', () => {
  it('should sort bites by likes in descending order', () => {
    const bites = [
      { id: 1, likes: ['user1', 'user2'] },
      { id: 2, likes: ['user1'] },
      { id: 3, likes: ['user1', 'user2', 'user3'] },
    ];

    const sortedBites = sortBitesByLikes(bites);

    expect(sortedBites[0].id).toBe(3);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should handle bites with no likes', () => {
    const bites = [
      { id: 1, likes: ['user1'] },
      { id: 2, likes: [] },
      { id: 3, likes: ['user1', 'user2'] },
    ];

    const sortedBites = sortBitesByLikes(bites);

    expect(sortedBites[0].id).toBe(3);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should return an empty array when input is empty', () => {
    const sortedBites = sortBitesByLikes([]);
    expect(sortedBites.length).toBe(0);
  });
});

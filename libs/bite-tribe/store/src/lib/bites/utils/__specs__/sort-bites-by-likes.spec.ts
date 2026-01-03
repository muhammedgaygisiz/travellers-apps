import { describe, expect, it } from 'vitest';
import { sortBitesByLikes } from '../sort-bites-by-likes';
import { Bite } from 'model';

describe('sortBitesByLikes', () => {
  it('should sort bites by likes in descending order', () => {
    const bites = [
      { id: 1, likes: ['user1', 'user2'] } as unknown as Bite,
      { id: 2, likes: ['user1'] } as unknown as Bite,
      { id: 3, likes: ['user1', 'user2', 'user3'] } as unknown as Bite,
    ];

    const sortedBites = sortBitesByLikes(bites);

    expect(sortedBites[0].id).toBe(3);
    expect(sortedBites[1].id).toBe(1);
    expect(sortedBites[2].id).toBe(2);
  });

  it('should handle bites with no likes', () => {
    const bites = [
      { id: 1, likes: ['user1'] } as unknown as Bite,
      { id: 2, likes: [] } as unknown as Bite,
      { id: 3, likes: ['user1', 'user2'] } as unknown as Bite,
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

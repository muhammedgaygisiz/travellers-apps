import { getLikesForBite } from '../get-likes-for-bite';
import { groupLikesByBiteId } from '../group-likes-by-bite-id';
import type { Bite, Like } from 'model';

describe('getLikesForBite', () => {
  it('should return an empty array if the index is undefined', () => {
    const result = getLikesForBite(undefined, { id: '1' } as Bite);

    expect(result).toEqual([]);
  });

  it('should return an empty array if bite is undefined', () => {
    const result = getLikesForBite(groupLikesByBiteId([]), undefined);

    expect(result).toEqual([]);
  });

  it('should return likes for the given bite', () => {
    const likes = [
      { biteId: '1' } as Like,
      { biteId: '2' } as Like,
      { biteId: '1' } as Like,
    ];

    const result = getLikesForBite(groupLikesByBiteId(likes), {
      id: '1',
    } as Bite);

    expect(result).toEqual([{ biteId: '1' }, { biteId: '1' }]);
  });

  it('should return an empty array if no likes match the bite', () => {
    const likes = [{ biteId: '2' } as Like, { biteId: '3' } as Like];

    const result = getLikesForBite(groupLikesByBiteId(likes), {
      id: '1',
    } as Bite);

    expect(result).toEqual([]);
  });

  /**
   * The feed joins likes onto hundreds of Bites, most of them unliked. One
   * shared empty array keeps that from allocating per Bite on every recompute.
   */
  it('should share one empty array across bites without likes', () => {
    const index = groupLikesByBiteId([{ biteId: '1' } as Like]);

    expect(getLikesForBite(index, { id: '2' } as Bite)).toBe(
      getLikesForBite(index, { id: '3' } as Bite),
    );
  });
});

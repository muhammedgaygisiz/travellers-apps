import { groupLikesByBiteId } from '../group-likes-by-bite-id';
import type { Like } from 'model';

describe('groupLikesByBiteId', () => {
  it('should return an empty index for undefined likes', () => {
    expect(groupLikesByBiteId(undefined).size).toBe(0);
  });

  it('should group every like under its bite id', () => {
    const likes = [
      { biteId: '1', userId: 'a' } as Like,
      { biteId: '2', userId: 'b' } as Like,
      { biteId: '1', userId: 'c' } as Like,
    ];

    const index = groupLikesByBiteId(likes);

    expect(index.get('1')).toEqual([
      { biteId: '1', userId: 'a' },
      { biteId: '1', userId: 'c' },
    ]);
    expect(index.get('2')).toEqual([{ biteId: '2', userId: 'b' }]);
  });

  it('should not hold an entry for a bite without likes', () => {
    const index = groupLikesByBiteId([{ biteId: '1' } as Like]);

    expect(index.has('2')).toBe(false);
  });
});

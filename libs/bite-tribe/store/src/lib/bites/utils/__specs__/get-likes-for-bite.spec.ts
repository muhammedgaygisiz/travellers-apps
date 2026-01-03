import { describe, expect, it } from 'vitest';
import { getLikesForBite } from '../get-likes-for-bite';
import { Bite, Like } from 'model';

describe('getLikesForBite', () => {
  it('should return an empty array if likes is undefined', () => {
    const result = getLikesForBite(undefined, { id: '1' } as any);
    expect(result).toEqual([]);
  });

  it('should return an empty array if bite is undefined', () => {
    const result = getLikesForBite([], undefined as any);
    expect(result).toEqual([]);
  });

  it('should return likes for the given bite', () => {
    const likes = [
      { biteId: '1' } as Like,
      { biteId: '2' } as Like,
      { biteId: '1' } as Like,
    ];
    const bite = { id: '1' } as Bite;
    const result = getLikesForBite(likes, bite);
    expect(result).toEqual([{ biteId: '1' }, { biteId: '1' }]);
  });

  it('should return an empty array if no likes match the bite', () => {
    const likes = [{ biteId: '2' } as Like, { biteId: '3' } as Like];
    const bite = { id: '1' } as Bite;
    const result = getLikesForBite(likes, bite);
    expect(result).toEqual([]);
  });
});

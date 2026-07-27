import { Bite, Like } from 'model';
import {
  getLikeCount,
  getLikeCounts,
  getTotalLikeCount,
  getUserLikeType,
} from '../like-counts';

const createLike = (overrides: Partial<Like> = {}): Like => ({
  userId: 'user1',
  likeType: 'thumbup',
  createdAt: '2026-01-01T00:00:00.000Z',
  biteId: 'bite-1',
  ...overrides,
});

const createBite = (overrides: Partial<Bite> = {}): Bite => ({
  id: 'bite-1',
  name: 'Test Bite',
  image: '',
  place: 'Test Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
  ...overrides,
});

describe('like-counts', () => {
  describe('getLikeCount', () => {
    it('should return 0 for a missing bite', () => {
      expect(getLikeCount(undefined, 'thumbup')).toBe(0);
      expect(getLikeCount(null, 'thumbup')).toBe(0);
    });

    it('should return the aggregate count when it is present', () => {
      expect(getLikeCount(createBite({ thumbup: 3 }), 'thumbup')).toBe(3);
    });

    it('should fall back to the loaded likes when the aggregate is missing', () => {
      expect(
        getLikeCount(createBite({ likes: [createLike()] }), 'thumbup'),
      ).toBe(1);
    });

    it('should fall back to the loaded likes when the aggregate is still 0', () => {
      expect(
        getLikeCount(
          createBite({ thumbup: 0, likes: [createLike()] }),
          'thumbup',
        ),
      ).toBe(1);
    });

    it('should keep the aggregate when it is already ahead of the loaded likes', () => {
      expect(
        getLikeCount(
          createBite({ thumbup: 4, likes: [createLike()] }),
          'thumbup',
        ),
      ).toBe(4);
    });

    it('should only count loaded likes of the requested type', () => {
      expect(
        getLikeCount(
          createBite({ likes: [createLike({ likeType: 'drooling' })] }),
          'thumbup',
        ),
      ).toBe(0);
    });
  });

  describe('getLikeCounts', () => {
    it('should return zero counts for a missing bite', () => {
      expect(getLikeCounts(undefined)).toEqual({
        thumbup: 0,
        drooling: 0,
        mindblown: 0,
      });
    });

    it('should merge the aggregates with the loaded likes per like type', () => {
      expect(
        getLikeCounts(
          createBite({
            thumbup: 2,
            likes: [createLike({ likeType: 'mindblown' })],
          }),
        ),
      ).toEqual({
        thumbup: 2,
        drooling: 0,
        mindblown: 1,
      });
    });
  });

  describe('getTotalLikeCount', () => {
    it('should sum the aggregates', () => {
      expect(
        getTotalLikeCount(
          createBite({ thumbup: 1, drooling: 2, mindblown: 3 }),
        ),
      ).toBe(6);
    });

    it('should show the own reaction while the aggregate is still lagging', () => {
      expect(getTotalLikeCount(createBite({ likes: [createLike()] }))).toBe(1);
    });
  });

  describe('getUserLikeType', () => {
    it('should return undefined without a user id', () => {
      expect(
        getUserLikeType(createBite({ likes: [createLike()] }), undefined),
      ).toBeUndefined();
    });

    it('should return the like type of the given user', () => {
      expect(
        getUserLikeType(
          createBite({ likes: [createLike({ likeType: 'drooling' })] }),
          'user1',
        ),
      ).toBe('drooling');
    });

    it('should return undefined when the user has not reacted', () => {
      expect(
        getUserLikeType(createBite({ likes: [createLike()] }), 'user2'),
      ).toBeUndefined();
    });
  });
});

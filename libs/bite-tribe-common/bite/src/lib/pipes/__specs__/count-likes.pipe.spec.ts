import { CountLikesPipe } from '../count-likes.pipe';

describe(CountLikesPipe.name, () => {
  const pipe = new CountLikesPipe();

  describe('given no bite', () => {
    it('should return 0', () => {
      expect(pipe.transform(null as any)).toBe(0);
      expect(pipe.transform(undefined as any)).toBe(0);
    });
  });

  describe('given bite with no likes', () => {
    it('should return 0', () => {
      expect(pipe.transform({} as any)).toBe(0);
    });
  });

  describe('given bite with aggregate like counts', () => {
    it('should return the total aggregate count', () => {
      expect(
        pipe.transform({ thumbup: 1, drooling: 2, mindblown: 3 } as any),
      ).toBe(6);
    });
  });

  describe('given bite with likes but no aggregate counts', () => {
    it('should ignore likes and return 0', () => {
      expect(pipe.transform({ likes: ['user1', 'user2'] } as any)).toBe(0);
    });
  });
});

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

  describe('given bite with likes', () => {
    it('should return the number of likes', () => {
      expect(pipe.transform({ likes: ['user1', 'user2'] } as any)).toBe(2);
    });
  });
});

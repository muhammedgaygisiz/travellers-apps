import { CountLikesPipe } from '../count-likes.pipe';
import { Bite } from 'model';

const createBite = (overrides: Partial<Bite> = {}): Bite => ({
  id: 'bite-1',
  name: 'Test Bite',
  image: '',
  place: 'Test Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
  ...overrides,
});

describe(CountLikesPipe.name, () => {
  const pipe = new CountLikesPipe();

  describe('given no bite', () => {
    it('should return 0', () => {
      expect(pipe.transform(null)).toBe(0);
      expect(pipe.transform(undefined)).toBe(0);
    });
  });

  describe('given bite with no likes', () => {
    it('should return 0', () => {
      expect(pipe.transform(createBite())).toBe(0);
    });
  });

  describe('given bite with aggregate like counts', () => {
    it('should return the total aggregate count', () => {
      expect(
        pipe.transform(createBite({ thumbup: 1, drooling: 2, mindblown: 3 })),
      ).toBe(6);
    });
  });

  describe('given bite with likes but no aggregate counts', () => {
    it('should fall back to the loaded likes', () => {
      expect(
        pipe.transform(
          createBite({
            likes: [
              {
                userId: 'user1',
                likeType: 'thumbup',
                createdAt: '2026-01-01T00:00:00.000Z',
                biteId: 'bite-1',
              },
            ],
          }),
        ),
      ).toBe(1);
    });
  });
});

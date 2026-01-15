import { byDistance } from '../by-distance';
import { Bite } from 'model';

describe('byDistance', () => {
  describe('given distances as numbers', () => {
    it('should sort bites by distance', () => {
      const bites = [
        { id: 1, distance: 10 },
        { id: 2, distance: 5 },
        { id: 3, distance: 15 },
      ] as unknown as Bite[];

      const sortedBites = bites.sort(byDistance);

      expect(sortedBites).toEqual([
        { id: 2, distance: 5 },
        { id: 1, distance: 10 },
        { id: 3, distance: 15 },
      ]);
    });
  });

  describe('given distances as strings', () => {
    it('should sort bites by distance', () => {
      const bites = [
        { id: 1, distance: '10' },
        { id: 2, distance: '5' },
        { id: 3, distance: '15' },
      ] as unknown as Bite[];

      const sortedBites = bites.sort(byDistance);

      expect(sortedBites).toEqual([
        { id: 2, distance: '5' },
        { id: 1, distance: '10' },
        { id: 3, distance: '15' },
      ]);
    });
  });

  describe('given some bites with distances and some without', () => {
    it('should sort bites by distance, placing those without distance at the end', () => {
      const bites = [
        { id: 1, distance: 10 },
        { id: 2 },
        { id: 3, distance: 5 },
        { id: 4 },
      ] as unknown as Bite[];

      const sortedBites = bites.sort(byDistance);

      expect(sortedBites).toEqual([
        { id: 3, distance: 5 },
        { id: 1, distance: 10 },
        { id: 2 },
        { id: 4 },
      ]);
    });
  });

  describe('given bites without distances', () => {
    it('should maintain their order', () => {
      const bites = [{ id: 1 }, { id: 2 }, { id: 3 }] as unknown as Bite[];

      const sortedBites = bites.sort(byDistance);

      expect(sortedBites).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });
  });
});

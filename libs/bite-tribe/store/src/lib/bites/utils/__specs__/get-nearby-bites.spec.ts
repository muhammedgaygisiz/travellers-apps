import { getNearbyBites } from '../get-nearby-bites';

describe('getNearbyBites', () => {
  describe('given nearby bites', () => {
    it('should return nearby bites', () => {
      const bites = [
        { id: '1', distance: '0.5' },
        { id: '2', distance: '1.0' },
        { id: '3', distance: '16' },
        { id: '4' }, // No distance provided
      ];

      const nearbyBites = getNearbyBites(
        bites as unknown as Parameters<typeof getNearbyBites>[0],
      );

      expect(nearbyBites).toEqual([
        { id: '1', distance: '0.5' },
        { id: '2', distance: '1.0' },
      ]);
    });
  });

  describe('given no nearby bites', () => {
    it('should return an empty array', () => {
      const bites = [
        { id: '1', distance: '16' },
        { id: '2', distance: '20' },
        { id: '3' }, // No distance provided
      ];

      const nearbyBites = getNearbyBites(
        bites as unknown as Parameters<typeof getNearbyBites>[0],
      );

      expect(nearbyBites).toEqual([]);
    });
  });
});

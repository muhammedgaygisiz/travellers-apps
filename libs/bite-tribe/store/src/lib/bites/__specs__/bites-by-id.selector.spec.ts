import { Bite, Like } from 'model';
import {
  bitesByUser,
  bitesByUserIdWithMetadata,
  mybites,
} from '../bites-by-id.selector';

describe('Bite by User ID Selectors', () => {
  const mockBite1: Bite = {
    id: '1',
    name: 'Test Bite 1',
    place: 'Test Place',
    price: 10,
    userId: 'user1',
  } as Bite;

  const mockBite2: Bite = {
    id: '2',
    name: 'Test Bite 2',
    place: 'Test Place 2',
    price: 15,
    userId: 'user2',
  } as Bite;

  describe('bitesByUserIdWithMetadata', () => {
    it('should return bites with metadata', () => {
      const bites = [mockBite1, mockBite2];
      const likes: Like[] = [];
      const gpsPosition = { latitude: 0, longitude: 0 };

      const result = bitesByUserIdWithMetadata.projector(
        bites,
        likes,
        gpsPosition,
      );

      expect(result).toEqual([
        {
          ...mockBite1,
          likes: [],
        },
        {
          ...mockBite2,
          likes: [],
        },
      ]);
    });
  });

  describe('bitesByUser', () => {
    it('should filter bites by user ID', () => {
      const bites = [
        {
          ...mockBite1,
          likes: [],
        },
        {
          ...mockBite2,
          likes: [],
        },
      ];
      const userId = 'user1';

      const result = bitesByUser.projector(bites, userId);

      expect(result).toEqual([
        {
          ...mockBite1,
          likes: [],
        },
      ]);
    });
  });

  describe('mybites', () => {
    it('should return all bites when no filters are applied', () => {
      const bites = [
        {
          ...mockBite1,
          likes: [],
        },
        {
          ...mockBite2,
          likes: [],
        },
      ];
      const filters: string[] = [];
      const maxPriceInPreferredCurrency = 0;
      const preferredCurrency = 'USD';
      const gpsPosition = { latitude: 0, longitude: 0 };
      const myBitesDistance = undefined;
      const exchangeRates = {};

      const result = mybites.projector(
        bites,
        filters,
        maxPriceInPreferredCurrency,
        preferredCurrency,
        gpsPosition,
        myBitesDistance,
        exchangeRates,
      );

      expect(result).toEqual(bites);
    });
  });

  describe('sortedBitesByUser', () => {
    it('should sort bites by distance', () => {
      const bites = [
        {
          ...mockBite1,
          position: { latitude: 0, longitude: 0 },
          likes: [],
        },
        {
          ...mockBite2,
          position: { latitude: 1, longitude: 1 },
          likes: [],
        },
      ];
      const likes: Like[] = [];
      const gpsPosition = { latitude: 0, longitude: 0 };

      const result = bitesByUserIdWithMetadata.projector(
        bites,
        likes,
        gpsPosition,
      );

      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });
});

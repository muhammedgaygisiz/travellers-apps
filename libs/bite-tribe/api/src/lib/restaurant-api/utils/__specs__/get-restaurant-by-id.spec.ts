import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { getRestaurantById } from '../get-restaurant-by-id';

jest.mock('@capacitor-firebase/firestore');

describe('getRestaurantById', () => {
  describe('given a found restaurant', () => {
    it('should process response and call FirebaseFirestore.getDocument', async () => {
      const getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: {
            data: {
              id: 'resto-123',
              name: 'Test Restaurant',
            },
          },
        } as unknown as never);

      const restaurant = await getRestaurantById('resto-123');

      expect(getDocumentSpy).toHaveBeenCalledWith({
        reference: 'restaurants/resto-123',
      });
      expect(restaurant).toEqual({
        id: 'resto-123',
        name: 'Test Restaurant',
      });
    });
  });

  describe('given no restaurant found', () => {
    describe('with matching restaurant by name', () => {
      const RESTAURANTS_WITH_MATCHING_NAME = [
        {
          id: 'resto-001',
          data: { name: 'Sample Restaurant' },
        },
        {
          id: 'resto-002',
          data: { name: 'Test Restaurant' },
        },
      ];

      it('should query top 10 restaurants and try to match by name', async () => {
        const getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: {
              data: undefined,
            },
          } as unknown as never);

        const getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({
            snapshots: RESTAURANTS_WITH_MATCHING_NAME,
          } as unknown as never);

        const restaurant = await getRestaurantById(
          encodeURIComponent('Test Restaurant'),
        );

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/Test%20Restaurant',
        });

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'restaurants',
          queryConstraints: [{ type: 'limit', limit: 10 }],
        });

        expect(restaurant).toEqual({
          id: 'resto-002',
          name: 'Test Restaurant',
        });
      });
    });

    describe('with no mathing restaurant by name', () => {
      it('should return undefined', async () => {
        const getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: {
              data: undefined,
            },
          } as unknown as never);

        const getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({
            snapshots: [],
          } as unknown as never);

        const restaurant = await getRestaurantById(
          encodeURIComponent('Nonexistent Restaurant'),
        );

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/Nonexistent%20Restaurant',
        });

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'restaurants',
          queryConstraints: [{ type: 'limit', limit: 10 }],
        });

        expect(restaurant).toBeUndefined();
      });
    });

    describe('with no snapshots in queryResult', () => {
      it('should return undefined', async () => {
        const getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: {
              data: undefined,
            },
          } as unknown as never);

        const getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({
            snapshots: undefined,
          } as unknown as never);

        const restaurant = await getRestaurantById(
          encodeURIComponent('Another Nonexistent Restaurant'),
        );

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/Another%20Nonexistent%20Restaurant',
        });

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'restaurants',
          queryConstraints: [{ type: 'limit', limit: 10 }],
        });

        expect(restaurant).toBeUndefined();
      });
    });
  });

  describe('given an error', () => {
    it('should catch error and return undefined', async () => {
      const getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockRejectedValue(new Error('Firestore error'));

      const restaurant = await getRestaurantById('resto-error');

      expect(getDocumentSpy).toHaveBeenCalledWith({
        reference: 'restaurants/resto-error',
      });

      expect(restaurant).toBeUndefined();
    });
  });
});

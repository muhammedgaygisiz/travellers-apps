import { RestaurantApiService } from '../restaurant-api.service';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as getRestaurantByIdUtils from '../utils/get-restaurant-by-id';

jest.mock('../utils/get-restaurant-by-id');

jest.mock('@capacitor-firebase/firestore');

describe(RestaurantApiService.name, () => {
  let service: RestaurantApiService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    service = TestBed.inject(RestaurantApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loadRestaurantById', () => {
    describe('given logged in true', () => {
      describe('and no restaurant id', () => {
        it('should return EMPTY', async () => {
          const result = await service.loadRestaurantById('');

          expect(result).toBeUndefined();
        });
      });

      describe('and valid restaurant id', () => {
        it('should call getRestaurantById and return restaurant', async () => {
          const getRestaurantByIdSpy = jest
            .spyOn(getRestaurantByIdUtils, 'getRestaurantById')
            .mockResolvedValue({
              id: 'resto-123',
              name: 'Test Restaurant',
            } as any);

          const result = await service.loadRestaurantById('resto-123');

          expect(result).toEqual({
            id: 'resto-123',
            name: 'Test Restaurant',
          });

          expect(getRestaurantByIdSpy).toHaveBeenCalledWith('resto-123');
        });
      });
    });
  });

  describe('saveNewRestaurant', () => {
    let addDocumentSpy: jest.SpyInstance;
    let updateDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      addDocumentSpy = jest.spyOn(FirebaseFirestore, 'addDocument');
      updateDocumentSpy = jest.spyOn(FirebaseFirestore, 'updateDocument');
    });

    afterEach(() => {
      addDocumentSpy.mockClear();
      updateDocumentSpy.mockClear();
    });

    describe('given biteIds', () => {
      it('should remove bite ids, save restaurant and add a new menu for it', async () => {
        const mockedNewRestaurant = {
          name: 'New Resto',
          biteIds: ['bite1', 'bite2'],
        } as any;

        addDocumentSpy
          .mockResolvedValueOnce({ reference: { id: 'New Resto' } } as any)
          .mockResolvedValueOnce({ reference: { id: 'menu-456' } } as any);

        updateDocumentSpy
          .mockResolvedValueOnce({ reference: { id: 'menu-789' } } as any)
          .mockResolvedValueOnce({} as any)
          .mockResolvedValueOnce({} as any);

        await service.saveNewRestaurant(mockedNewRestaurant);

        expect(addDocumentSpy).toHaveBeenCalledTimes(2);
        expect(updateDocumentSpy).toHaveBeenCalledTimes(3);

        expect(addDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'restaurants',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            name: 'New Resto',
          },
        });

        expect(addDocumentSpy).toHaveBeenNthCalledWith(2, {
          reference: 'menus',
          data: {
            categories: [],
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'restaurants/New Resto',
          data: {
            menuId: '/menus/menu-456',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(2, {
          reference: 'bites/bite1',
          data: {
            restaurantId: '/restaurants/New Resto',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(3, {
          reference: 'bites/bite2',
          data: {
            restaurantId: '/restaurants/New Resto',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });

    describe('given biteIds is empty list', () => {
      it('should save restaurant and add a new menu for it without updating bites', async () => {
        const mockedNewRestaurant = {
          name: 'New Resto',
          biteIds: [],
        } as any;

        addDocumentSpy
          .mockResolvedValueOnce({ reference: { id: 'New Resto' } } as any)
          .mockResolvedValueOnce({ reference: { id: 'menu-456' } } as any);

        updateDocumentSpy.mockResolvedValueOnce({
          reference: { id: 'menu-789' },
        } as any);

        await service.saveNewRestaurant(mockedNewRestaurant);

        expect(addDocumentSpy).toHaveBeenCalledTimes(2);
        expect(updateDocumentSpy).toHaveBeenCalledTimes(1);

        expect(addDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'restaurants',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            name: 'New Resto',
          },
        });

        expect(addDocumentSpy).toHaveBeenNthCalledWith(2, {
          reference: 'menus',
          data: {
            categories: [],
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'restaurants/New Resto',
          data: {
            menuId: '/menus/menu-456',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });
  });

  describe('saveSocialMediaLinksForRestaurant', () => {
    it('should update the restaurant with social media links', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue({} as any);

      const restaurantId = 'resto-123';
      const links = [
        { platform: 'Facebook', url: 'https://facebook.com/resto' },
        { platform: 'Instagram', url: 'https://instagram.com/resto' },
      ] as any;

      await service.saveSocialMediaLinksForRestaurant(restaurantId, links);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: `restaurants/${restaurantId}`,
        data: {
          socialMediaLinks: links,
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });
  });
});

import { RestaurantApiService } from '../restaurant-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TestScheduler } from 'rxjs/testing';
import { of } from 'rxjs';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    getDocument: jest.fn(),
    addDocument: jest.fn(),
    updateDocument: jest.fn(),
    getCollection: jest.fn(),
  },
}));

const MockedAuthService = {
  isLoggedIn$: of(false),
};

describe(RestaurantApiService.name, () => {
  let service: RestaurantApiService;
  let scheduler: TestScheduler;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(RestaurantApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startListener', () => {
    let addCollectionSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addCollectionSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockResolvedValue('mocked-callback-id');
    });

    it('should start the listener', async () => {
      await service.startListener();

      expect(addCollectionSnapshotListenerSpy).toHaveBeenCalled();
    });

    describe('given passed callback of listener', () => {
      it('should handle response when listener callback is invoked', async () => {
        await service.startListener();

        const mockRestaurantsDocs = {
          snapshots: [
            { id: '1', data: { name: 'Restaurant 1' } },
            { id: '2', data: { name: 'Restaurant 2' } },
          ],
        } as any;

        // Simulate the callback invocation
        const callback = addCollectionSnapshotListenerSpy.mock.calls[0][1];
        callback(mockRestaurantsDocs);
      });
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      nextSpy = jest
        .spyOn((service as any)._restaurantsChannel$, 'next')
        .mockImplementation();
    });

    it('should handle the response and update restaurants channel', () => {
      const mockDocs = {
        snapshots: [
          { id: '1', data: { name: 'Restaurant 1' } },
          { id: '2', data: { name: 'Restaurant 2' } },
        ],
      } as any;

      service.handleResponse(mockDocs);

      expect(nextSpy).toHaveBeenCalled();
    });
  });

  describe('stopRestaurantListener', () => {
    it('should call stopped$.next and removeSnapshotListener', async () => {
      const removeSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'removeSnapshotListener')
        .mockResolvedValue();

      const callbackId = 'test-callback-id';

      await service.stopRestaurantListener(callbackId);

      expect(removeSnapshotListenerSpy).toHaveBeenCalledWith({
        callbackId,
      });
    });
  });

  describe('loadRestaurant', () => {
    describe('given logged in true', () => {
      describe('and no restaurant id', () => {
        it('should return EMPTY', () => {
          scheduler.run(({ expectObservable }) => {
            (service as any).authService.isLoggedIn$ = of(true);

            const result$ = service.loadRestaurant('');

            expectObservable(result$).toBe('|');
          });
        });
      });

      describe('and valid restaurant id', () => {
        it('should call getRestaurantById and return restaurant', () => {
          const getRestaurantByIdSpy = jest
            .spyOn(service, 'getRestaurantById')
            .mockReturnValue(
              of({
                id: 'resto-123',
                name: 'Test Restaurant',
              }) as any,
            );

          scheduler.run(({ expectObservable }) => {
            // Update isLoggedIn$ to emit true
            (service as any).authService.isLoggedIn$ = of(true);

            const result$ = service.loadRestaurant('resto-123');

            expectObservable(result$).toBe('(a|)', {
              a: { id: 'resto-123', name: 'Test Restaurant' },
            });
          });

          expect(getRestaurantByIdSpy).toHaveBeenCalledWith('resto-123');
        });
      });
    });
  });

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
          } as any);

        const restaurant = await service.getRestaurantById('resto-123');

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
            } as any);

          const getCollectionSpy = jest
            .spyOn(FirebaseFirestore, 'getCollection')
            .mockResolvedValue({
              snapshots: RESTAURANTS_WITH_MATCHING_NAME,
            } as any);

          const restaurant = await service.getRestaurantById(
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
            } as any);

          const getCollectionSpy = jest
            .spyOn(FirebaseFirestore, 'getCollection')
            .mockResolvedValue({
              snapshots: [],
            } as any);

          const restaurant = await service.getRestaurantById(
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
    });
  });

  describe('saveNewRestaurant', () => {
    it('should remove bite ids, save restaurant and add a new menu for it', async () => {
      const mockedNewRestaurant = {
        name: 'New Resto',
        biteIds: ['bite1', 'bite2'],
      } as any;

      const addDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValueOnce({ reference: { id: 'New Resto' } } as any)
        .mockResolvedValueOnce({ reference: { id: 'menu-456' } } as any);

      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
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

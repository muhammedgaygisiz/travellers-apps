import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import {
  RESTAURANT_COLLECTION,
  RestaurantsDataAccessService,
} from '../restaurants-data-access.service';

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));

type FirestoreCollection = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;

/**
 * The reads and writes behind restaurant ownership, added with issue #1077.
 *
 * Kept in their own file rather than appended to the candidate suite: the two
 * halves of this service answer different questions, and the candidate suite
 * mocks `callByName` with a verification result.
 */
describe(`${RestaurantsDataAccessService.name} ownership`, () => {
  let service: RestaurantsDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        RestaurantsDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            restaurantToCreate$: of(undefined),
            logout: jest.fn(),
            selectRestaurantToCreate: jest.fn(),
            saveNewRestaurant: jest.fn(),
          },
        },
        {
          provide: BiteTribeApiService,
          useValue: {
            searchPlaces: jest.fn(),
            getPlaceDetails: jest.fn(),
            saveRestaurantImage: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(RestaurantsDataAccessService);
  });

  describe('restaurantsLoader', () => {
    // Unowned restaurants are the ones an operator is usually looking for, so
    // the read is the whole collection rather than the assigned half of it.
    it('should load every restaurant with its ownership fields, sorted by name', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          { id: 'r2', data: { name: 'Pizza Palace' } },
          {
            id: 'r1',
            data: {
              name: 'Cafe Central',
              ownerUserId: 'owner-1',
              claimStatus: 'claimed',
            },
          },
        ],
      } as unknown as FirestoreCollection);

      const result = await service.restaurantsLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: RESTAURANT_COLLECTION,
      });
      expect(result).toEqual([
        {
          id: 'r1',
          name: 'Cafe Central',
          ownerUserId: 'owner-1',
          claimStatus: 'claimed',
        },
        { id: 'r2', name: 'Pizza Palace' },
      ]);
    });

    it('should return an empty list when the snapshots are missing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      expect(await service.restaurantsLoader({} as never)).toEqual([]);
    });
  });

  describe('assignRestaurantOwner', () => {
    it('should call the operator callable with the restaurant, the account and the reason', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: {
          restaurantId: 'r1',
          ownerUserId: 'owner-1',
          claimStatus: 'claimed',
          status: 'assigned',
        },
      });

      const result = await service.assignRestaurantOwner(
        'r1',
        'owner-1',
        'Verified on the phone.',
      );

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'assignRestaurantOwner',
        data: {
          restaurantId: 'r1',
          ownerUserId: 'owner-1',
          reason: 'Verified on the phone.',
        },
      });
      expect(result.status).toBe('assigned');
    });
  });

  describe('revokeRestaurantOwner', () => {
    // Its own callable rather than an assignment with an empty owner, so the
    // log carries a reason for the removal and a reason for the next grant.
    it('should call the operator callable with the restaurant and the reason', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: {
          restaurantId: 'r1',
          previousOwnerUserId: 'owner-1',
          claimStatus: 'revoked',
        },
      });

      const result = await service.revokeRestaurantOwner(
        'r1',
        'Restaurant closed.',
      );

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'revokeRestaurantOwner',
        data: { restaurantId: 'r1', reason: 'Restaurant closed.' },
      });
      expect(result.previousOwnerUserId).toBe('owner-1');
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  BITE_COLLECTION,
  DASHBOARD_RESTAURANT_CANDIDATES_LIMIT,
  DashboardDataAccessService,
  RESTAURANT_CANDIDATES_COLLECTION,
  RESTAURANT_COLLECTION,
  USERS_COLLECTION,
} from '../dashboard-data-access.service';
import { Restaurant } from 'model';

jest.mock('@capacitor-firebase/firestore');
jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));

type FirestoreCollection = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;
type FirestoreDocument = Awaited<
  ReturnType<typeof FirebaseFirestore.getDocument>
>;

describe(DashboardDataAccessService.name, () => {
  let storeServiceMock: {
    isAuthenticated$: ReturnType<typeof of<boolean>>;
    position$: ReturnType<typeof of<null>>;
    logout: jest.Mock;
    selectRestaurantToCreate: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storeServiceMock = {
      isAuthenticated$: of(false),
      position$: of(null),
      logout: jest.fn(),
      selectRestaurantToCreate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: storeServiceMock,
        },
      ],
    });
  });

  describe('restaurantsLoader', () => {
    it('should load restaurants from Firestore', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          {
            id: 'restaurant-1',
            data: {
              name: 'Pizza Palace',
              position: { latitude: 46.948, longitude: 7.4474 },
            },
          },
        ],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.restaurantsLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: RESTAURANT_COLLECTION,
      });
      expect(result).toEqual([
        {
          id: 'restaurant-1',
          name: 'Pizza Palace',
          position: { latitude: 46.948, longitude: 7.4474 },
        },
      ]);
    });

    it('should return an empty list when restaurant snapshots are missing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.restaurantsLoader({} as never);

      expect(result).toEqual([]);
    });
  });

  describe('organisationsLoader', () => {
    it('should load organisation users from Firestore', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          {
            id: 'organisation-1',
            data: {
              userId: 'organisation-1',
              displayName: 'Bite Org',
              isOrganisation: true,
            },
          },
        ],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.organisationsLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: USERS_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'isOrganisation',
              opStr: '==',
              value: true,
            },
          ],
        },
      });
      expect(result).toEqual([
        {
          userId: 'organisation-1',
          displayName: 'Bite Org',
          isOrganisation: true,
        },
      ]);
    });

    it('should return an empty list when organisation snapshots are missing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.organisationsLoader({} as never);

      expect(result).toEqual([]);
    });
  });

  describe('bitePlacesLoader', () => {
    it('should load unique Bite places without verified restaurants', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          { id: 'bite-1', data: { place: 'Pizza Palace' } },
          { id: 'bite-2', data: { place: 'Pizza Palace' } },
          { id: 'bite-3', data: { place: 'Cafe Central' } },
          { id: 'bite-4', data: { place: '' } },
        ],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.bitePlacesLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: BITE_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'restaurantId',
              opStr: '==',
              value: '',
            },
          ],
        },
        queryConstraints: [
          {
            type: 'limit',
            limit: 10,
          },
        ],
      });
      expect(result).toEqual(['Pizza Palace', 'Cafe Central']);
    });

    it('should return an empty list when Bite place snapshots are missing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.bitePlacesLoader({} as never);

      expect(result).toEqual([]);
    });
  });

  describe('restaurantCandidatesLoader', () => {
    it('should load the top pending restaurant candidates with Bite evidence', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          {
            id: 'candidate-1',
            data: {
              name: 'Pizza Palace',
              status: 'pending',
              biteIds: ['bite-1', 'bite-2'],
            },
          },
        ],
      } as unknown as FirestoreCollection);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValueOnce({
          snapshot: {
            id: 'bite-1',
            data: { name: 'Margherita', place: 'Pizza Palace' },
          },
        } as unknown as FirestoreDocument)
        .mockResolvedValueOnce({
          snapshot: {
            id: 'bite-2',
            data: { name: 'Calzone', place: 'Pizza Palace' },
          },
        } as unknown as FirestoreDocument);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: RESTAURANT_CANDIDATES_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'status',
              opStr: '==',
              value: 'pending',
            },
          ],
        },
        queryConstraints: [
          {
            type: 'limit',
            limit: DASHBOARD_RESTAURANT_CANDIDATES_LIMIT,
          },
        ],
      });
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `${BITE_COLLECTION}/bite-1`,
      });
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `${BITE_COLLECTION}/bite-2`,
      });
      expect(result).toEqual([
        {
          id: 'candidate-1',
          name: 'Pizza Palace',
          status: 'pending',
          biteIds: ['bite-1', 'bite-2'],
          bites: [
            {
              id: 'bite-1',
              name: 'Margherita',
              place: 'Pizza Palace',
            },
            {
              id: 'bite-2',
              name: 'Calzone',
              place: 'Pizza Palace',
            },
          ],
        },
      ]);
    });

    it('should return an empty list when no pending candidate snapshots are found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result).toEqual([]);
      expect(FirebaseFirestore.getDocument).not.toHaveBeenCalled();
    });

    it('should omit missing Bite evidence documents from candidates', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          {
            id: 'candidate-1',
            data: {
              name: 'Pizza Palace',
              status: 'pending',
              biteIds: ['bite-1', 'missing-bite'],
            },
          },
        ],
      } as unknown as FirestoreCollection);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValueOnce({
          snapshot: {
            id: 'bite-1',
            data: { name: 'Margherita', place: 'Pizza Palace' },
          },
        } as unknown as FirestoreDocument)
        .mockResolvedValueOnce({
          snapshot: {
            id: 'missing-bite',
          },
        } as unknown as FirestoreDocument);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.restaurantCandidatesLoader({} as never);

      expect(result?.[0].bites).toEqual([
        {
          id: 'bite-1',
          name: 'Margherita',
          place: 'Pizza Palace',
        },
      ]);
    });
  });

  describe('logout', () => {
    it('should delegate logout to the store service', () => {
      const service = TestBed.inject(DashboardDataAccessService);

      service.logout();

      expect(storeServiceMock.logout).toHaveBeenCalled();
    });
  });

  describe('selectRestaurantToCreate', () => {
    it('should delegate the selected restaurant to the store service', () => {
      const restaurant = {
        id: '',
        name: 'Pizza Palace',
        position: { latitude: 46.948, longitude: 7.4474 },
        unsaved: true,
      } as Restaurant;
      const service = TestBed.inject(DashboardDataAccessService);

      service.selectRestaurantToCreate(restaurant);

      expect(storeServiceMock.selectRestaurantToCreate).toHaveBeenCalledWith(
        restaurant,
      );
    });
  });
});

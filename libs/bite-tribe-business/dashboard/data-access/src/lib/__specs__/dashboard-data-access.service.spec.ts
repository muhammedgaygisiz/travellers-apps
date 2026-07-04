import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  BITE_COLLECTION,
  DASHBOARD_RESTAURANT_CANDIDATES_LIMIT,
  DashboardDataAccessService,
  RESTAURANT_CANDIDATES_COLLECTION,
} from '../dashboard-data-access.service';

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
  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        DashboardDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            isAuthenticated$: of(false),
            position$: of(null),
            logout: jest.fn(),
            selectRestaurantToCreate: jest.fn(),
          },
        },
      ],
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
  });
});

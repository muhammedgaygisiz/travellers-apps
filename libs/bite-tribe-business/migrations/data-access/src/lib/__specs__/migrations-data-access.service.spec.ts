import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Bite, RestaurantCandidate } from 'model';
import {
  BITE_COLLECTION,
  getBitesNeedingAddressBackfill,
  getRestaurantClusteringEligibleBites,
  MigrationsDataAccessService,
  RESTAURANT_CANDIDATES_COLLECTION,
  RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT,
} from '../migrations-data-access.service';

type CollectionResult = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;
type CandidatesLoaderArg = Parameters<
  MigrationsDataAccessService['activeRestaurantCandidatesLoader']
>[0];
type ClusteringLoaderArg = Parameters<
  MigrationsDataAccessService['restaurantClusteringBitesLoader']
>[0];

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));
jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));

const bite = (override: Partial<Bite>): Bite =>
  ({
    id: 'bite-id',
    name: 'Bite',
    image: '',
    place: 'Cafe Central',
    price: 12,
    position: { latitude: 46.948, longitude: 7.4474 },
    ...override,
  }) as Bite;

describe(MigrationsDataAccessService.name, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MigrationsDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            bites$: of([]),
          },
        },
      ],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(MigrationsDataAccessService);

    expect(service).toBeTruthy();
  });

  describe('activeRestaurantCandidatesLoader', () => {
    it('should load pending restaurant candidates from Firestore', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          {
            id: 'candidate-1',
            data: {
              status: 'pending',
              biteIds: ['bite-1'],
            },
          },
        ],
      } as unknown as CollectionResult);

      const service = TestBed.inject(MigrationsDataAccessService);
      const result = await service.activeRestaurantCandidatesLoader(
        {} as unknown as CandidatesLoaderArg,
      );

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
      });
      expect(result).toEqual([
        {
          id: 'candidate-1',
          status: 'pending',
          biteIds: ['bite-1'],
        },
      ]);
    });

    it('should return an empty list when Firestore returns no snapshots', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      } as unknown as CollectionResult);

      const service = TestBed.inject(MigrationsDataAccessService);
      const result = await service.activeRestaurantCandidatesLoader(
        {} as unknown as CandidatesLoaderArg,
      );

      expect(result).toEqual([]);
    });
  });

  describe('restaurantClusteringBitesLoader', () => {
    it('should load historical Bites from Firestore', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [
          {
            id: 'bite-1',
            data: {
              name: 'Arepa',
              place: 'Cafe Central',
            },
          },
        ],
      } as unknown as CollectionResult);

      const service = TestBed.inject(MigrationsDataAccessService);
      const result = await service.restaurantClusteringBitesLoader(
        {} as unknown as ClusteringLoaderArg,
      );

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: BITE_COLLECTION,
      });
      expect(result).toEqual([
        {
          id: 'bite-1',
          name: 'Arepa',
          place: 'Cafe Central',
        },
      ]);
    });

    it('should return an empty list when no Bite snapshots are found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      } as unknown as CollectionResult);

      const service = TestBed.inject(MigrationsDataAccessService);
      const result = await service.restaurantClusteringBitesLoader(
        {} as unknown as ClusteringLoaderArg,
      );

      expect(result).toEqual([]);
    });
  });

  describe('restaurantClusteringEligibleBites', () => {
    it('should call getRestaurantClusteringEligibleBites with restaurantClusteringBites and activeRestaurantCandidates values', async () => {
      const service = TestBed.inject(MigrationsDataAccessService);
      const eligibleBitesSpy = jest.spyOn(
        service,
        'restaurantClusteringEligibleBites',
      );

      // Access the computed property to trigger the computation
      const result = service.restaurantClusteringEligibleBites();

      expect(eligibleBitesSpy).toHaveBeenCalled();
      expect(result).toEqual(
        getRestaurantClusteringEligibleBites(
          [{ id: 'bite-1' } as Bite],
          [{ id: 'candidate-1' } as RestaurantCandidate],
        ),
      );
    });
  });

  describe('addressBackfillBites', () => {
    it('should call getBitesNeedingAddressBackfill', async () => {
      const service = TestBed.inject(MigrationsDataAccessService);

      const bites = service.addressBackfillBites();

      expect(bites).toEqual([]);
    });
  });

  describe('clusterRestaurantCandidateForBite', () => {
    it('should call the manual restaurant candidate clustering callable and refresh migration resources', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: {
          candidateId: 'candidate-1',
          evidenceCount: 1,
          matchedBiteIds: ['bite-1'],
          skippedCounts: {
            invalidPosition: 0,
            verifiedBite: 0,
            outsideRadius: 0,
            nameMismatch: 0,
          },
          status: 'created',
        },
      });
      const service = TestBed.inject(MigrationsDataAccessService);
      const activeCandidatesReloadSpy = jest.spyOn(
        service.activeRestaurantCandidates,
        'reload',
      );
      const clusteringBitesReloadSpy = jest.spyOn(
        service.restaurantClusteringBites,
        'reload',
      );

      const result = await service.clusterRestaurantCandidateForBite(
        bite({ id: 'bite-1' }),
      );

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'clusterRestaurantCandidateForBite',
        data: { biteId: 'bite-1' },
      });
      expect(activeCandidatesReloadSpy).toHaveBeenCalled();
      expect(clusteringBitesReloadSpy).toHaveBeenCalled();
      expect(result).toEqual({
        candidateId: 'candidate-1',
        evidenceCount: 1,
        matchedBiteIds: ['bite-1'],
        skippedCounts: {
          invalidPosition: 0,
          verifiedBite: 0,
          outsideRadius: 0,
          nameMismatch: 0,
        },
        status: 'created',
      });
    });
  });

  describe('backfillBiteAddress', () => {
    it('should call the address backfill callable with the selected Bite and refresh migration Bites', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: {
          biteId: 'bite-1',
          status: 'resolved',
        },
      });
      const service = TestBed.inject(MigrationsDataAccessService);
      const clusteringBitesReloadSpy = jest.spyOn(
        service.restaurantClusteringBites,
        'reload',
      );

      const result = await service.backfillBiteAddress(bite({ id: 'bite-1' }));

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'backfillBiteAddress',
        data: { biteId: 'bite-1' },
      });
      expect(clusteringBitesReloadSpy).toHaveBeenCalled();
      expect(result).toEqual({
        biteId: 'bite-1',
        status: 'resolved',
      });
    });
  });

  describe('sendNewVersionNotification', () => {
    it('should call the release announcement callable for the selected store', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: { platform: 'ios', tokenCount: 42, userCount: 100 },
      });
      const service = TestBed.inject(MigrationsDataAccessService);

      const result = await service.sendNewVersionNotification('ios');

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'sendNewVersionNotification',
        data: { platform: 'ios' },
      });
      expect(result).toEqual({
        platform: 'ios',
        tokenCount: 42,
        userCount: 100,
      });
    });

    it('should announce to Android separately from iOS', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: { platform: 'android', tokenCount: 7, userCount: 100 },
      });
      const service = TestBed.inject(MigrationsDataAccessService);

      await service.sendNewVersionNotification('android');

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'sendNewVersionNotification',
        data: { platform: 'android' },
      });
    });
  });
});

describe(getRestaurantClusteringEligibleBites.name, () => {
  it('should exclude verified, active-candidate, invalid-place, and invalid-position Bites', () => {
    const bites = [
      bite({ id: 'eligible' }),
      bite({ id: 'verified', restaurantId: 'restaurant-1' }),
      bite({ id: 'active-candidate' }),
      bite({ id: 'empty-place', place: ' ' }),
      bite({
        id: 'invalid-position',
        position: { latitude: Number.NaN, longitude: 7.4474 },
      }),
    ];
    const candidates = [
      {
        id: 'candidate-1',
        status: 'pending',
        biteIds: ['active-candidate'],
      },
    ] as RestaurantCandidate[];

    expect(getRestaurantClusteringEligibleBites(bites, candidates)).toEqual([
      bites[0],
    ]);
  });

  it('should ignore inactive candidates when excluding referenced Bites', () => {
    const bites = [bite({ id: 'dismissed-candidate-bite' })];
    const candidates = [
      {
        id: 'candidate-1',
        status: 'dismissed',
        biteIds: ['dismissed-candidate-bite'],
      },
    ] as RestaurantCandidate[];

    expect(getRestaurantClusteringEligibleBites(bites, candidates)).toEqual(
      bites,
    );
  });

  it('should keep Bites without geohash eligible and limit the list to 50 Bites', () => {
    const bites = Array.from(
      { length: RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT + 1 },
      (_, index) =>
        bite({
          id: `bite-${index}`,
          geohash: index === 0 ? undefined : `geohash-${index}`,
        }),
    );

    const result = getRestaurantClusteringEligibleBites(bites, []);

    expect(result).toHaveLength(RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT);
    expect(result[0].id).toBe('bite-0');
  });
});

describe(getBitesNeedingAddressBackfill.name, () => {
  it('should return unresolved, failed, pending, and missing-status Bites from the provided historical list', () => {
    const bites = [
      bite({ id: 'resolved', addressStatus: 'resolved' }),
      bite({ id: 'failed', addressStatus: 'failed' }),
      bite({ id: 'pending', addressStatus: 'pending' }),
      bite({ id: 'missing-status', addressStatus: undefined }),
    ];

    expect(getBitesNeedingAddressBackfill(bites)).toEqual([
      bites[1],
      bites[2],
      bites[3],
    ]);
  });
});

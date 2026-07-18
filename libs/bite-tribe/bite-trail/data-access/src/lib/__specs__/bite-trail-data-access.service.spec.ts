import { TestBed } from '@angular/core/testing';
import { BiteTrailDataAccessService } from '../bite-trail-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import type { Bite, BiteTrail, Bucketlist, Geopoint } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const biteTrailIdSignal = signal<string | undefined>(undefined);

const mockStoreService = {
  biteTrailIdFromUrl: biteTrailIdSignal,
  userId$: of('user-1'),
  isAuthenticated$: of(true),
  position$: of({ latitude: 47.3769, longitude: 8.5417 }),
  bucketlists$: of([]),
  saveBiteTrailAsBucketList: jest.fn(),
};

const makeBite = (overrides: Partial<Bite> = {}): Bite =>
  ({
    id: 'bite-1',
    place: 'Test Restaurant',
    tags: [],
    position: { latitude: 47.377, longitude: 8.542 },
    likes: [],
    rating: 4,
    price: 20,
    createdAtTimestamp: 1000,
    ...overrides,
  }) as unknown as Bite;

const makeBiteTrail = (overrides: Partial<BiteTrail> = {}): BiteTrail => ({
  id: 'trail-1',
  ownerId: 'owner-1',
  name: 'My Trail',
  biteIds: [],
  imagePath: '',
  ownerImagePath: '',
  ownerName: 'Owner',
  location: 'Zurich',
  description: '',
  price: 0,
  currency: 'CHF',
  ...overrides,
});

const loaderParams = <T>(
  params: T,
): {
  params: T;
  abortSignal: AbortSignal;
  previous: { status: 'idle' };
} => ({
  params,
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' as const },
});

type TestResource<T> = { value: () => T | undefined };
type MutableService = {
  biteTrail: TestResource<BiteTrail>;
  bites: TestResource<Bite[]>;
  gpsPosition: () => Geopoint | null | undefined;
  bucketlists: () => Bucketlist[];
};

describe(BiteTrailDataAccessService.name, () => {
  let service: BiteTrailDataAccessService;
  let mutableService: MutableService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BiteTrailDataAccessService,
        { provide: BiteTribeStoreService, useValue: mockStoreService },
      ],
    });

    service = TestBed.inject(BiteTrailDataAccessService);
    mutableService = service as unknown as MutableService;
    biteTrailIdSignal.set(undefined);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('biteTrailName', () => {
    it('should return empty string when no bite trail loaded', () => {
      expect(service.biteTrailName()).toBe('');
    });
  });

  describe('isFree', () => {
    it('should return false when no bite trail is loaded', () => {
      expect(service.isFree()).toBe(false);
    });

    it('should return true when bite trail price is 0', () => {
      mutableService.biteTrail = {
        value: signal(makeBiteTrail({ price: 0 })),
      };
      expect(service.isFree()).toBe(true);
    });

    it('should return false when bite trail price is greater than 0', () => {
      mutableService.biteTrail = {
        value: signal(makeBiteTrail({ price: 10 })),
      };
      expect(service.isFree()).toBe(false);
    });
  });

  describe('saveBiteTrailAsBucketList', () => {
    it('should do nothing when bite trail is undefined', () => {
      mutableService.biteTrail = { value: signal(undefined) };
      service.saveBiteTrailAsBucketList();
      expect(mockStoreService.saveBiteTrailAsBucketList).not.toHaveBeenCalled();
    });

    it('should dispatch saveBiteTrailAsBucketList with trail name, biteIds and biteTrailId', () => {
      const trail = makeBiteTrail({
        id: 'trail-1',
        name: 'My Trail',
        biteIds: ['b1', 'b2'],
        price: 0,
      });
      mutableService.biteTrail = { value: signal(trail) };
      service.saveBiteTrailAsBucketList();
      expect(mockStoreService.saveBiteTrailAsBucketList).toHaveBeenCalledWith({
        bucketListName: 'My Trail',
        biteIds: ['b1', 'b2'],
        biteTrailId: 'trail-1',
      });
    });
  });

  describe('savedBucketlistId', () => {
    it('should return null when no bucketlists exist', () => {
      mutableService.bucketlists = signal([]);
      expect(service.savedBucketlistId()).toBeNull();
    });

    it('should return null when no bucketlist matches the current bite trail', () => {
      biteTrailIdSignal.set('trail-1');
      mutableService.bucketlists = signal([
        {
          id: 'bl-1',
          biteTrailId: 'other-trail',
          name: 'Other',
          biteIds: [],
          userId: 'u',
        },
      ]);
      expect(service.savedBucketlistId()).toBeNull();
    });

    it('should return bucketlist id when a bucketlist matches the current bite trail', () => {
      biteTrailIdSignal.set('trail-1');
      mutableService.bucketlists = signal([
        {
          id: 'bl-42',
          biteTrailId: 'trail-1',
          name: 'My Trail BL',
          biteIds: [],
          userId: 'u',
        },
      ]);
      expect(service.savedBucketlistId()).toBe('bl-42');
    });
  });

  describe('biteTrailLoader', () => {
    it('should return undefined when biteTrailId is undefined', async () => {
      const result = await service.biteTrailLoader(
        loaderParams({ biteTrailId: undefined }),
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined when snapshot has no data', async () => {
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'trail-1', data: null },
      });
      const result = await service.biteTrailLoader(
        loaderParams({ biteTrailId: 'trail-1' }),
      );
      expect(result).toBeUndefined();
    });

    it('should return bite trail when snapshot has data', async () => {
      const trailData = { name: 'My Trail', biteIds: ['b1', 'b2'] };
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'trail-1', data: trailData },
      });
      const result = await service.biteTrailLoader(
        loaderParams({ biteTrailId: 'trail-1' }),
      );
      expect(result).toEqual({ id: 'trail-1', ...trailData });
    });
  });

  describe('bitesLoader', () => {
    it('should return empty array when biteIds is empty', async () => {
      const result = await service.bitesLoader(loaderParams({ biteIds: [] }));
      expect(result).toEqual([]);
    });

    it('should return empty array when biteIds is undefined', async () => {
      const result = await service.bitesLoader(
        loaderParams({ biteIds: undefined }),
      );
      expect(result).toEqual([]);
    });

    it('should return bites when snapshots have data', async () => {
      const biteData = { place: 'Pizzeria', tags: [] };
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'bite-1', data: biteData },
      });
      const result = await service.bitesLoader(
        loaderParams({ biteIds: ['bite-1'] }),
      );
      expect(result).toEqual([{ id: 'bite-1', ...biteData }]);
    });

    it('should filter out null bites when snapshot has no data', async () => {
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'bite-1', data: null },
      });
      const result = await service.bitesLoader(
        loaderParams({ biteIds: ['bite-1'] }),
      );
      expect(result).toEqual([]);
    });
  });

  describe('bitesWithDistance', () => {
    it('should return bites with distance when bites and position are available', () => {
      const mockBites = [
        makeBite({ id: 'b1', position: { latitude: 47.38, longitude: 8.55 } }),
      ];
      mutableService.bites = { value: signal(mockBites) };
      mutableService.gpsPosition = signal({
        latitude: 47.38,
        longitude: 8.55,
      });

      const result = service.bitesWithDistance();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('b1');
    });

    it('should return bites with distance when gps position is null', () => {
      const mockBites = [
        makeBite({ id: 'b1', position: { latitude: 47.38, longitude: 8.55 } }),
      ];
      mutableService.bites = { value: signal(mockBites) };
      mutableService.gpsPosition = signal(null);

      const result = service.bitesWithDistance();
      expect(result.length).toBe(1);
    });

    it('should return bites with distance when bite has no position', () => {
      const mockBites = [makeBite({ id: 'b1', position: undefined })];
      mutableService.bites = { value: signal(mockBites) };
      mutableService.gpsPosition = signal({
        latitude: 47.38,
        longitude: 8.55,
      });

      const result = service.bitesWithDistance();
      expect(result.length).toBe(1);
    });

    it('should return empty when bites resource returns undefined', () => {
      mutableService.bites = { value: signal(undefined) };
      const result = service.bitesWithDistance();
      expect(result).toEqual([]);
    });
  });
});

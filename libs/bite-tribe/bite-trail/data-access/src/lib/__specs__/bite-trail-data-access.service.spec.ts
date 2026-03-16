import { TestBed } from '@angular/core/testing';
import { BiteTrailDataAccessService } from '../bite-trail-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import type { Bite } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const biteTrailIdSignal = signal<string | undefined>(undefined);

const mockStoreService = {
  biteTrailIdFromUrl: biteTrailIdSignal,
  userId$: of('user-1'),
  isAuthenticated$: of(true),
  position$: of({ latitude: 47.3769, longitude: 8.5417 }),
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

describe(BiteTrailDataAccessService.name, () => {
  let service: BiteTrailDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BiteTrailDataAccessService,
        { provide: BiteTribeStoreService, useValue: mockStoreService },
      ],
    });

    service = TestBed.inject(BiteTrailDataAccessService);
    biteTrailIdSignal.set(undefined);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setSorting', () => {
    it('should update sorting signal', () => {
      service.setSorting('likes');
      expect(service.sorting()).toBe('likes');
    });
  });

  describe('setFilters', () => {
    it('should update tag filters', () => {
      service.setFilters(['pizza', 'italian']);
      expect(service.tagFilters()).toEqual(['pizza', 'italian']);
    });
  });

  describe('clearFilters', () => {
    it('should reset tag filters to empty', () => {
      service.setFilters(['pizza']);
      service.clearFilters();
      expect(service.tagFilters()).toEqual([]);
    });
  });

  describe('biteTrailName', () => {
    it('should return empty string when no bite trail loaded', () => {
      expect(service.biteTrailName()).toBe('');
    });
  });

  describe('biteTrailLoader', () => {
    it('should return undefined when biteTrailId is undefined', async () => {
      const result = await service.biteTrailLoader({
        params: { biteTrailId: undefined },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toBeUndefined();
    });

    it('should return undefined when snapshot has no data', async () => {
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'trail-1', data: null },
      });
      const result = await service.biteTrailLoader({
        params: { biteTrailId: 'trail-1' },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toBeUndefined();
    });

    it('should return bite trail when snapshot has data', async () => {
      const trailData = { name: 'My Trail', biteIds: ['b1', 'b2'] };
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'trail-1', data: trailData },
      });
      const result = await service.biteTrailLoader({
        params: { biteTrailId: 'trail-1' },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toEqual({ id: 'trail-1', ...trailData });
    });
  });

  describe('bitesLoader', () => {
    it('should return empty array when biteIds is empty', async () => {
      const result = await service.bitesLoader({
        params: { biteIds: [] },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toEqual([]);
    });

    it('should return empty array when biteIds is undefined', async () => {
      const result = await service.bitesLoader({
        params: { biteIds: undefined },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toEqual([]);
    });

    it('should return bites when snapshots have data', async () => {
      const biteData = { place: 'Pizzeria', tags: [] };
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'bite-1', data: biteData },
      });
      const result = await service.bitesLoader({
        params: { biteIds: ['bite-1'] },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toEqual([{ id: 'bite-1', ...biteData }]);
    });

    it('should filter out null bites when snapshot has no data', async () => {
      (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
        snapshot: { id: 'bite-1', data: null },
      });
      const result = await service.bitesLoader({
        params: { biteIds: ['bite-1'] },
        abortSignal: new AbortController().signal,
        request: undefined as any,
        previous: { status: 'idle' } as any,
      });
      expect(result).toEqual([]);
    });
  });

  describe('bitesWithDistance', () => {
    it('should return bites with distance when bites and position are available', () => {
      const mockBites = [
        makeBite({ id: 'b1', position: { latitude: 47.38, longitude: 8.55 } }),
      ];
      (service as any).bites = { value: signal(mockBites) };
      (service as any).gpsPosition = signal({
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
      (service as any).bites = { value: signal(mockBites) };
      (service as any).gpsPosition = signal(null);

      const result = service.bitesWithDistance();
      expect(result.length).toBe(1);
    });

    it('should return bites with distance when bite has no position', () => {
      const mockBites = [makeBite({ id: 'b1', position: undefined })];
      (service as any).bites = { value: signal(mockBites) };
      (service as any).gpsPosition = signal({
        latitude: 47.38,
        longitude: 8.55,
      });

      const result = service.bitesWithDistance();
      expect(result.length).toBe(1);
    });

    it('should return empty when bites resource returns undefined', () => {
      (service as any).bites = { value: signal(undefined) };
      const result = service.bitesWithDistance();
      expect(result).toEqual([]);
    });
  });

  describe('sortedBites', () => {
    it('should return empty array when no bites available', () => {
      expect(service.sortedBites()).toEqual([]);
    });
  });

  describe('sortBites', () => {
    const bites: Bite[] = [
      makeBite({
        id: 'b1',
        distance: '5',
        likes: [{}] as any,
        createdAtTimestamp: 100,
        rating: 3,
        price: 30,
      }),
      makeBite({
        id: 'b2',
        distance: '2',
        likes: [{}, {}] as any,
        createdAtTimestamp: 200,
        rating: 5,
        price: 10,
      }),
      makeBite({
        id: 'b3',
        distance: '8',
        likes: [] as any,
        createdAtTimestamp: 50,
        rating: 4,
        price: 20,
      }),
    ];

    it('should sort by distance', () => {
      const sorted = (service as any).sortBites([...bites], 'distance');
      expect(sorted.map((b: Bite) => b.id)).toEqual(['b2', 'b1', 'b3']);
    });

    it('should sort by likes', () => {
      const sorted = (service as any).sortBites([...bites], 'likes');
      expect(sorted.map((b: Bite) => b.id)).toEqual(['b2', 'b1', 'b3']);
    });

    it('should sort by createdAt', () => {
      const sorted = (service as any).sortBites([...bites], 'createdAt');
      expect(sorted.map((b: Bite) => b.id)).toEqual(['b2', 'b1', 'b3']);
    });

    it('should sort by rating', () => {
      const sorted = (service as any).sortBites([...bites], 'rating');
      expect(sorted.map((b: Bite) => b.id)).toEqual(['b2', 'b3', 'b1']);
    });

    it('should sort by price', () => {
      const sorted = (service as any).sortBites([...bites], 'price');
      expect(sorted.map((b: Bite) => b.id)).toEqual(['b2', 'b3', 'b1']);
    });

    it('should use default sort for unknown sorting', () => {
      const sorted = (service as any).sortBites([...bites], 'unknown');
      expect(sorted.length).toBe(3);
    });

    it('should sort by distance handling undefined distance as Infinity', () => {
      const bitesWithUndefined: Bite[] = [
        makeBite({ id: 'no-dist', distance: undefined }),
        makeBite({ id: 'has-dist', distance: '1' }),
      ];
      const sorted = (service as any).sortBites(bitesWithUndefined, 'distance');
      expect(sorted[0].id).toBe('has-dist');
    });
  });

  describe('applyTagFilters', () => {
    const bites: Bite[] = [
      makeBite({ id: 'b1', tags: ['Pizza', 'Italian'] }),
      makeBite({ id: 'b2', tags: ['Burger', 'American'] }),
      makeBite({ id: 'b3', tags: [] }),
    ];

    it('should return all bites when no tag filters', () => {
      const result = (service as any).applyTagFilters(bites, []);
      expect(result.length).toBe(3);
    });

    it('should filter bites matching tag filter', () => {
      const result = (service as any).applyTagFilters(bites, ['pizza']);
      expect(result.map((b: Bite) => b.id)).toEqual(['b1']);
    });

    it('should filter bites with multiple tag filters (AND logic)', () => {
      const result = (service as any).applyTagFilters(bites, [
        'pizza',
        'italian',
      ]);
      expect(result.map((b: Bite) => b.id)).toEqual(['b1']);
    });

    it('should return empty when no bite matches all filters', () => {
      const result = (service as any).applyTagFilters(bites, [
        'pizza',
        'burger',
      ]);
      expect(result.length).toBe(0);
    });

    it('should use empty array for bite with undefined tags', () => {
      const bitesWithNoTags: Bite[] = [
        makeBite({ id: 'b1', tags: undefined as any }),
      ];
      const result = (service as any).applyTagFilters(bitesWithNoTags, [
        'pizza',
      ]);
      expect(result.length).toBe(0);
    });
  });
});

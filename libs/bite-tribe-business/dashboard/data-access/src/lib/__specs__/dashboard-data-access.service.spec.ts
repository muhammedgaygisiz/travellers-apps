import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import {
  BITE_TRAIL_COLLECTION,
  DashboardDataAccessService,
  MENU_COLLECTION,
  RESTAURANT_COLLECTION,
  RESTAURANT_OWNERS_FIELD,
} from '../dashboard-data-access.service';
import { BiteTrail, Restaurant } from 'model';
import { signal } from '@angular/core';

jest.mock('@capacitor-firebase/firestore');
jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));
jest.mock('bite-tribe/api', () => ({
  BiteTribeApiService: class BiteTribeApiService {},
}));

const apiMock = { bitesByPosition: jest.fn() };

type FirestoreCollection = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;
describe(DashboardDataAccessService.name, () => {
  let storeServiceMock: {
    isAuthenticated$: ReturnType<typeof of<boolean>>;
    position$: ReturnType<typeof of<null>>;
    user: ReturnType<typeof signal<{ uid: string } | undefined>>;
    logout: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storeServiceMock = {
      isAuthenticated$: of(false),
      position$: of(null),
      user: signal<{ uid: string } | undefined>(undefined),
      logout: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: storeServiceMock,
        },
        { provide: BiteTribeApiService, useValue: apiMock },
      ],
    });
  });

  describe('restaurantsLoader', () => {
    const createParams = (userId?: string): never =>
      ({ params: { userId } }) as never;

    it('should load only the restaurants assigned to the signed-in account', async () => {
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
      const result = await service.restaurantsLoader(createParams('user-1'));

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: RESTAURANT_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: RESTAURANT_OWNERS_FIELD,
              opStr: 'array-contains',
              value: 'user-1',
            },
          ],
        },
      });
      expect(result).toEqual([
        {
          id: 'restaurant-1',
          name: 'Pizza Palace',
          position: { latitude: 46.948, longitude: 7.4474 },
        },
      ]);
    });

    /**
     * The filter is strict: without a uid there is nothing to scope by, so the
     * answer is an empty list rather than the whole collection. Reading it
     * unfiltered "just until the user arrives" is exactly the leak issue #1079
     * closes, and it would show for the moment between boot and restoration.
     */
    it('should return an empty list without a signed-in user', async () => {
      const service = TestBed.inject(DashboardDataAccessService);

      const result = await service.restaurantsLoader(createParams());

      expect(FirebaseFirestore.getCollection).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return an empty list when restaurant snapshots are missing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.restaurantsLoader(createParams('user-1'));

      expect(result).toEqual([]);
    });
  });

  describe('biteTrailsLoader', () => {
    const createParams = (userId?: string): never =>
      ({ params: { userId } }) as never;

    it('should return an empty list without a signed-in user', async () => {
      const service = TestBed.inject(DashboardDataAccessService);

      const result = await service.biteTrailsLoader(createParams());

      expect(FirebaseFirestore.getCollection).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should load the BiteTrails owned by the signed-in user', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [{ id: 'trail-1', data: { name: 'Bern Brunch Walk' } }],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.biteTrailsLoader(createParams('user-1'));

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: BITE_TRAIL_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'ownerId',
              opStr: '==',
              value: 'user-1',
            },
          ],
        },
      });
      expect(result).toEqual([
        { id: 'trail-1', name: 'Bern Brunch Walk' } as BiteTrail,
      ]);
    });

    it('should return an empty list when there are no snapshots', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(DashboardDataAccessService);
      const result = await service.biteTrailsLoader(createParams('user-1'));

      expect(result).toEqual([]);
    });
  });

  describe('logout', () => {
    it('should delegate logout to the store service', () => {
      const service = TestBed.inject(DashboardDataAccessService);

      service.logout();

      expect(storeServiceMock.logout).toHaveBeenCalled();
    });
  });

  /** See GitHub issue #2302. */
  /** GitHub issue #2133. */
  describe('figuresLoader', () => {
    const TRATTORIA = {
      id: 'r-1',
      name: 'Trattoria Roma',
      position: { latitude: 48.137, longitude: 11.575 },
      followersCount: 7,
    } as Restaurant;
    const load = (
      restaurants: Restaurant[],
    ): ReturnType<DashboardDataAccessService['figuresLoader']> =>
      TestBed.inject(DashboardDataAccessService).figuresLoader({
        params: { restaurants },
      } as never);

    it('counts the Bites the consumer page shows, their rating and the followers', async () => {
      apiMock.bitesByPosition.mockResolvedValue([
        { place: 'Trattoria Roma', rating: 4, position: TRATTORIA.position },
        {
          place: 'Elsewhere',
          restaurantId: '/restaurants/r-1',
          rating: 5,
          position: TRATTORIA.position,
        },
        { place: 'Trattoria Roma', position: TRATTORIA.position },
        { place: 'Burger Bar', rating: 1, position: TRATTORIA.position },
        {
          place: 'Trattoria Roma',
          rating: 1,
          position: { latitude: 48.2, longitude: 11.7 },
        },
      ]);

      const figures = await load([TRATTORIA]);

      expect(apiMock.bitesByPosition).toHaveBeenCalledWith({
        coords: TRATTORIA.position,
      });
      expect(figures?.get('r-1')).toEqual({
        bites: 3,
        ratings: 2,
        averageRating: 4.5,
        followers: 7,
      });
    });

    it('counts no followers on a restaurant nobody has followed', async () => {
      apiMock.bitesByPosition.mockResolvedValue([]);

      const figures = await load([{ ...TRATTORIA, followersCount: undefined }]);

      expect(figures?.get('r-1')).toEqual({
        bites: 0,
        ratings: 0,
        averageRating: 0,
        followers: 0,
      });
    });

    it('has no figures for a restaurant it cannot place or read', async () => {
      apiMock.bitesByPosition.mockRejectedValue(new Error('offline'));

      const figures = await load([
        TRATTORIA,
        { ...TRATTORIA, id: 'r-2', position: {} } as Restaurant,
        { ...TRATTORIA, id: undefined } as unknown as Restaurant,
      ]);

      expect(figures?.size).toBe(0);
      expect(apiMock.bitesByPosition).toHaveBeenCalledTimes(1);
    });
  });

  describe('menusBuiltFromBitesLoader', () => {
    const load = (
      restaurants: Partial<Restaurant>[],
    ): Promise<ReadonlySet<string>> =>
      TestBed.inject(DashboardDataAccessService).menusBuiltFromBitesLoader({
        params: { restaurants: restaurants as Restaurant[] },
      } as never) as Promise<ReadonlySet<string>>;

    const menus = (derived: Record<string, boolean>): void => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockImplementation(async ({ reference }) => {
          const id = reference.split('/').pop() ?? '';

          if (id === 'broken') {
            throw new Error('unavailable');
          }

          return {
            snapshot: {
              id,
              path: reference,
              data: id in derived ? { derivedFromBites: derived[id] } : {},
              metadata: { hasPendingWrites: false, fromCache: false },
            },
          } as never;
        });
    };

    it('names the restaurants whose menu was built from Bites', async () => {
      menus({ 'm-1': true, 'm-2': false });

      const built = await load([
        { id: 'r-1', menuId: 'm-1' },
        { id: 'r-2', menuId: 'm-2' },
        { id: 'r-3' },
      ]);

      expect([...built]).toEqual(['r-1']);
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(2);
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `${MENU_COLLECTION}/m-1`,
      });
    });

    it('reads a menu id stored as a path', async () => {
      menus({ 'm-1': true });

      const built = await load([{ id: 'r-1', menuId: '/menus/m-1' }]);

      expect([...built]).toEqual(['r-1']);
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `${MENU_COLLECTION}/m-1`,
      });
    });

    it("counts a menu that fails to read as the owner's own", async () => {
      menus({ 'm-1': true });

      const built = await load([
        { id: 'r-1', menuId: 'broken' },
        { id: 'r-2', menuId: 'm-1' },
      ]);

      expect([...built]).toEqual(['r-2']);
    });
  });
});

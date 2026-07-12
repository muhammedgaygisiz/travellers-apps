import { inject, TestBed } from '@angular/core/testing';
import { HomeDataAccessService } from '../home-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import type { Bite, LikeClick } from 'model';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { haversineDistance } from 'utils';

const BITE_WITH_POSITION: Bite = {
  id: 'biteId',
  name: 'Test Bite',
  image: '',
  place: 'Test Place',
  price: 10,
  position: { latitude: 48.2082, longitude: 16.3738 },
};

class StoreMock {
  sortedHomeBites$ = of([]);
  homeSorting$ = of('distance');
  mybites$ = of([]);
  imageUploads$ = of([]);
  sortedMyBites$ = of([]);
  myBitesSorting$ = of('distance');
  sortedRestaurantBites$ = of([]);
  restaurantBitesSorting$ = of('createdAt');
  bitesBySelectedBucketlist$ = of([]);
  allTags$ = of([]);
  homeFilters$ = of([]);
  userId$ = of('test-user-id');
  selectedBucketlist$ = of(null);
  selectedBucketlistTitle$ = of('');
  isAuthenticated$ = of(false);
  isBitesLoading$ = of(true);
  homeDistance$ = of(null);
  exchangeRates$ = of({});
  preferedCurrency$ = of('EUR');
  maxPriceHome$ = of(0);
  isReloadingHome$ = of(false);
  hasErrorLoadingGpsPosition$ = of(false);
  position$ = of(undefined);
  biteIdFromUrl = (): string | undefined => undefined;
  restaurantIdFromUrl = (): string | undefined => undefined;
  likes$ = of([]);
  logout = (): null => null;
  submitLikeClick = (): null => null;
  notifyLikesLoaded = jest.fn();
  submitDeleteBite = (): null => null;
  setHomeSorting = (): null => null;
  setMyBitesSorting = (): null => null;
  setRestaurantBitesSorting = (): null => null;
  setHomeFilters = (): null => null;
  clearHomeFilters = (): null => null;
  reloadGPSPosition = (): null => null;
  clearGpsError = (): null => null;
  setBiteTriedOutStatus = (): null => null;
  bite$ = of(undefined);
}

const ApiMock = {
  biteById: jest.fn(),
  bitesByPosition: jest.fn(),
  loadRestaurant: jest.fn(),
  loadLikesForBites: jest.fn(),
};

describe('HomeDataAccessService', () => {
  let biteTribeStoreService: BiteTribeStoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    ApiMock.biteById.mockResolvedValue(undefined);
    ApiMock.bitesByPosition.mockResolvedValue([]);
    ApiMock.loadRestaurant.mockResolvedValue(undefined);
    ApiMock.loadLikesForBites.mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        HomeDataAccessService,
        provideMockStore(),
        { provide: BiteTribeStoreService, useClass: StoreMock },
        { provide: BiteTribeApiService, useValue: ApiMock },
      ],
    }).compileComponents();
    biteTribeStoreService = TestBed.inject(BiteTribeStoreService);
  });

  it('should create the service', inject(
    [HomeDataAccessService],
    (service: HomeDataAccessService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('logout', () => {
    it('should call logout on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const logoutSpy = jest.spyOn(biteTribeStoreService, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitLikeClick', () => {
    it('should forward the like click to BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const submitLikeClickSpy = jest
          .spyOn(biteTribeStoreService, 'submitLikeClick')
          .mockImplementation();
        const likeClick: LikeClick = {
          likeType: 'thumbup',
          biteId: '456',
          action: 'save',
        };

        service.submitLikeClick(likeClick);

        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeClick);
      },
    ));
  });

  describe('deleteBite', () => {
    it('should call deleteBite on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const submitDeleteBiteSpy = jest.spyOn(
          biteTribeStoreService,
          'submitDeleteBite',
        );
        service.deleteBite({} as Bite);
        expect(submitDeleteBiteSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setHomeSorting', () => {
    it('should call setHomeSorting on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const setHomeSortingSpy = jest.spyOn(
          biteTribeStoreService,
          'setHomeSorting',
        );
        service.setHomeSorting('sorting');
        expect(setHomeSortingSpy).toHaveBeenCalledTimes(1);
        expect(setHomeSortingSpy).toHaveBeenCalledWith('sorting');
      },
    ));
  });

  describe('setMyBitesSorting', () => {
    it('should call setMyBitesSorting on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const setMyBitesSortingSpy = jest.spyOn(
          biteTribeStoreService,
          'setMyBitesSorting',
        );
        service.setMyBitesSorting('sorting');
        expect(setMyBitesSortingSpy).toHaveBeenCalledTimes(1);
        expect(setMyBitesSortingSpy).toHaveBeenCalledWith('sorting');
      },
    ));
  });

  describe('setRestaurantBitesSorting', () => {
    it('should call setRestaurantBitesSorting on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const setRestaurantBitesSortingSpy = jest.spyOn(
          biteTribeStoreService,
          'setRestaurantBitesSorting',
        );
        service.setRestaurantBitesSorting('sorting');
        expect(setRestaurantBitesSortingSpy).toHaveBeenCalledTimes(1);
        expect(setRestaurantBitesSortingSpy).toHaveBeenCalledWith('sorting');
      },
    ));
  });

  describe('setFilters', () => {
    it('should call setFilters on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const setHomeFiltersSpy = jest.spyOn(
          biteTribeStoreService,
          'setHomeFilters',
        );
        const filters = {
          tagFilters: ['tagFilters'],
          distanceFilter: 'distanceFilter',
          priceFilter: 123,
        };
        service.setFilters(filters);
        expect(setHomeFiltersSpy).toHaveBeenCalledTimes(1);
        expect(setHomeFiltersSpy).toHaveBeenCalledWith(filters);
      },
    ));
  });

  describe('clearFilters', () => {
    it('should call clearFilters on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const clearHomeFiltersSpy = jest.spyOn(
          biteTribeStoreService,
          'clearHomeFilters',
        );
        service.clearFilters();
        expect(clearHomeFiltersSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('reloadGPSPosition', () => {
    it('should call reloadGPSPosition', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const biteTribeStoreServiceSpy = jest.spyOn(
          biteTribeStoreService,
          'reloadGPSPosition',
        );
        service.reloadGPSPosition();
        expect(biteTribeStoreServiceSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('clearGpsError', () => {
    it('should call clearGpsError', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const biteTribeStoreServiceSpy = jest.spyOn(
          biteTribeStoreService,
          'clearGpsError',
        );
        service.clearGpsError();
        expect(biteTribeStoreServiceSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('markBiteAsTriedOut', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-20T10:11:12.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should dispatch bucketlist tried-out status when checked is true', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        jest.spyOn(service, 'selectedBucketlist').mockReturnValue({
          id: 'bucketlist-1',
        } as any);
        const setBiteTriedOutStatusSpy = jest.spyOn(
          biteTribeStoreService,
          'setBiteTriedOutStatus',
        );

        service.markBiteAsTriedOut({ biteId: 'bite-1', checked: true });

        expect(setBiteTriedOutStatusSpy).toHaveBeenCalledWith({
          bucketlistId: 'bucketlist-1',
          biteId: 'bite-1',
          checked: true,
        });
      },
    ));

    it('should dispatch bucketlist tried-out status when checked is false', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        jest.spyOn(service, 'selectedBucketlist').mockReturnValue({
          id: 'bucketlist-1',
        } as any);
        const setBiteTriedOutStatusSpy = jest.spyOn(
          biteTribeStoreService,
          'setBiteTriedOutStatus',
        );

        service.markBiteAsTriedOut({ biteId: 'bite-1', checked: false });

        expect(setBiteTriedOutStatusSpy).toHaveBeenCalledWith({
          bucketlistId: 'bucketlist-1',
          biteId: 'bite-1',
          checked: false,
        });
      },
    ));

    it('should not dispatch when no bucketlist is selected', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        jest
          .spyOn(service, 'selectedBucketlist')
          .mockReturnValue(undefined as any);
        const setBiteTriedOutStatusSpy = jest.spyOn(
          biteTribeStoreService,
          'setBiteTriedOutStatus',
        );

        service.markBiteAsTriedOut({ biteId: 'bite-1', checked: true });

        expect(setBiteTriedOutStatusSpy).not.toHaveBeenCalled();
      },
    ));

    it('should not dispatch when selected bucketlist is null', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        jest.spyOn(service, 'selectedBucketlist').mockReturnValue(null as any);
        const setBiteTriedOutStatusSpy = jest.spyOn(
          biteTribeStoreService,
          'setBiteTriedOutStatus',
        );

        service.markBiteAsTriedOut({ biteId: 'bite-1', checked: true });

        expect(setBiteTriedOutStatusSpy).not.toHaveBeenCalled();
      },
    ));
  });

  describe('restaurantBitesLoader', () => {
    it('should return empty array when no sourceBiteId', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: undefined, restaurantIdOrName: undefined },
        } as any);
        expect(result).toEqual([]);
      },
    ));

    it('should return empty array when biteById throws', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockRejectedValue(new Error('not found'));
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'id1', restaurantIdOrName: undefined },
        } as any);
        expect(result).toEqual([]);
      },
    ));

    it('should return empty array when source bite has no position', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue({ id: 'id1' } as Bite);
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'id1', restaurantIdOrName: undefined },
        } as any);
        expect(result).toEqual([]);
      },
    ));

    it('should return empty array when source bite has latitude but no longitude', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue({
          id: 'id1',
          position: { latitude: 48.0 },
        } as Bite);
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'id1', restaurantIdOrName: undefined },
        } as any);
        expect(result).toEqual([]);
      },
    ));

    it('should return only source bite when bitesByPosition throws', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockRejectedValue(new Error('network error'));
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
        } as any);
        expect(result).toEqual([BITE_WITH_POSITION]);
      },
    ));

    it('should call bitesByPosition with source bite coordinates', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([]);
        await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: 'place123' },
        } as any);
        expect(ApiMock.bitesByPosition).toHaveBeenCalledWith(
          expect.objectContaining({
            coords: {
              latitude: BITE_WITH_POSITION.position.latitude,
              longitude: BITE_WITH_POSITION.position.longitude,
            },
          }),
        );
      },
    ));

    it('should seed the likes of the current user for the loaded bites', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const like = {
          biteId: 'biteId',
          userId: 'test-user-id',
          likeType: 'thumbup',
          createdAt: '2026-01-01T00:00:00Z',
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([]);
        ApiMock.loadLikesForBites.mockResolvedValue([like]);

        await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
        } as any);
        await Promise.resolve();

        expect(ApiMock.loadLikesForBites).toHaveBeenCalledWith(
          [BITE_WITH_POSITION],
          'test-user-id',
        );
        expect(biteTribeStoreService.notifyLikesLoaded).toHaveBeenCalledWith([
          like,
        ]);
      },
    ));

    it('should not load likes when the loader returns no bites', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        await service.restaurantBitesLoader({
          params: { sourceBiteId: undefined, restaurantIdOrName: undefined },
        } as any);

        expect(ApiMock.loadLikesForBites).not.toHaveBeenCalled();
      },
    ));

    it('should include source bite at the top when not in matched list', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const otherBite: Bite = {
          ...BITE_WITH_POSITION,
          id: 'otherId',
          place: 'Test Place',
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([otherBite]);
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: 'TestPlace' },
        } as any);
        expect(result[0]).toEqual(BITE_WITH_POSITION);
      },
    ));

    it('should filter out nearby bites that have no position', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const biteNoPosition: Bite = {
          ...BITE_WITH_POSITION,
          id: 'noPos',
          position: undefined as any,
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([biteNoPosition]);
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
        } as any);
        expect(result).toEqual([BITE_WITH_POSITION]);
        expect(result).not.toContain(biteNoPosition);
      },
    ));

    it('should match bites by restaurant name when restaurant entity is resolved', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const matchingBite: Bite = {
          ...BITE_WITH_POSITION,
          id: 'matching',
          place: 'Test Place',
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([matchingBite]);
        ApiMock.loadRestaurant.mockResolvedValue({
          name: 'Test Place',
          id: 'r1',
        });
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: 'r1' },
        } as any);
        expect(result).toContain(matchingBite);
      },
    ));

    it('should match bite by restaurantId when restaurant entity is resolved', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const matchingBite: Bite = {
          ...BITE_WITH_POSITION,
          id: 'byRestaurantId',
          place: 'some unrelated place',
          restaurantId: 'restaurants/r1',
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([matchingBite]);
        ApiMock.loadRestaurant.mockResolvedValue({
          name: 'My Restaurant',
          id: 'r1',
        });
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: 'r1' },
        } as any);
        expect(result).toContain(matchingBite);
      },
    ));

    it('should return true for exact normalized place name match', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const exactBite: Bite = {
          ...BITE_WITH_POSITION,
          id: 'exact',
          place: 'myrestaurant',
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([exactBite]);
        ApiMock.loadRestaurant.mockResolvedValue(undefined);
        const result = await service.restaurantBitesLoader({
          params: {
            sourceBiteId: 'biteId',
            restaurantIdOrName: 'myrestaurant',
          },
        } as any);
        expect(result).toContain(exactBite);
      },
    ));

    it('should match bite by restaurantId when place name does not match by name or fuzzy', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const restaurantIdBite: Bite = {
          ...BITE_WITH_POSITION,
          id: 'byResId',
          place: 'xyz',
          restaurantId: 'restaurants/uniqueplace/sub',
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([restaurantIdBite]);
        ApiMock.loadRestaurant.mockResolvedValue(undefined);
        const result = await service.restaurantBitesLoader({
          params: {
            sourceBiteId: 'biteId',
            restaurantIdOrName: 'uniqueplace',
          },
        } as any);
        expect(result).toContain(restaurantIdBite);
      },
    ));

    it('should return all close bites when no restaurantIdOrName is provided', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const nearbyBite: Bite = { ...BITE_WITH_POSITION, id: 'nearby1' };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([nearbyBite]);
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
        } as any);
        expect(result).toContain(nearbyBite);
      },
    ));

    it('should not prepend source bite when it is already in matched list', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([BITE_WITH_POSITION]);
        const result = await service.restaurantBitesLoader({
          params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
        } as any);
        expect(result.filter((b: Bite) => b.id === 'biteId').length).toBe(1);
      },
    ));
  });

  describe('restaurantBites', () => {
    it('should return an empty array as the initial value', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        expect(service.restaurantBites()).toEqual([]);
      },
    ));

    it('should apply sortByCriteria to a loaded resource value', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        service.restaurantBitesResource.set([BITE_WITH_POSITION]);
        expect(service.restaurantBites()).toEqual([
          { ...BITE_WITH_POSITION, likes: [] },
        ]);
      },
    ));

    describe('given a known gps position', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.position$ = of({
            latitude: 48.2,
            longitude: 16.37,
          }) as any;
        },
      ));

      it('should enrich each loaded bite with the distance to the gps position', inject(
        [HomeDataAccessService],
        (service: HomeDataAccessService) => {
          service.restaurantBitesResource.set([BITE_WITH_POSITION]);

          const bite = service.restaurantBites()[0];

          expect(bite.distance).toBe(
            haversineDistance(
              BITE_WITH_POSITION.position?.latitude,
              BITE_WITH_POSITION.position?.longitude,
              48.2,
              16.37,
              'km',
            ),
          );
        },
      ));
    });

    describe('given the current user liked a loaded bite', () => {
      const like = {
        biteId: BITE_WITH_POSITION.id,
        userId: 'test-user-id',
        likeType: 'thumbup',
        createdAt: '2026-01-01T00:00:00Z',
      };

      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.likes$ = of([like]) as any;
        },
      ));

      it('should attach the like to the bite', inject(
        [HomeDataAccessService],
        (service: HomeDataAccessService) => {
          service.restaurantBitesResource.set([
            BITE_WITH_POSITION,
            { ...BITE_WITH_POSITION, id: 'other-bite' },
          ]);

          const bites = service.restaurantBites();

          expect(
            bites.find((b) => b.id === BITE_WITH_POSITION.id)?.likes,
          ).toEqual([like]);
          expect(bites.find((b) => b.id === 'other-bite')?.likes).toEqual([]);
        },
      ));
    });
  });
});

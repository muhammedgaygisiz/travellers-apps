import { inject, TestBed } from '@angular/core/testing';
import { HomeDataAccessService } from '../home-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import type { Bite, Bucketlist, Like, LikeClick } from 'model';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { haversineDistance } from 'utils';
import {
  getLocationPermissionState,
  openLocationSettings,
  requestLocationPermission,
} from 'geolocation';

jest.mock('geolocation', () => ({
  getLocationPermissionState: jest.fn(),
  openLocationSettings: jest.fn(),
  requestLocationPermission: jest.fn(),
}));

const getLocationPermissionStateMock = getLocationPermissionState as jest.Mock;
const openLocationSettingsMock = openLocationSettings as jest.Mock;
const requestLocationPermissionMock = requestLocationPermission as jest.Mock;

const BITE_WITH_POSITION: Bite = {
  id: 'biteId',
  name: 'Test Bite',
  image: '',
  place: 'Test Place',
  price: 10,
  position: { latitude: 48.2082, longitude: 16.3738 },
};

const SELECTED_BUCKETLIST: Bucketlist = {
  id: 'bucketlist-1',
  userId: 'test-user-id',
  name: 'Test Bucketlist',
  biteIds: [],
};

type RestaurantBitesLoaderParams = Parameters<
  HomeDataAccessService['restaurantBitesLoader']
>[0];

type WeeklyBitesLoaderParams = Parameters<
  HomeDataAccessService['weeklyBitesLoader']
>[0];

const createWeeklyLoaderParams = (
  range: { weekStart: number; weekEnd: number } | undefined,
): WeeklyBitesLoaderParams => ({
  params: { range },
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' },
});

const createLoaderParams = (
  request: Pick<RestaurantBitesLoaderParams, 'params'>,
): RestaurantBitesLoaderParams => ({
  params: request.params,
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' },
});

class StoreMock {
  sortedHomeBites$ = of([]);
  homeSorting$ = of('distance');
  mybites$ = of([]);
  imageUploads$ = of([]);
  sortedMyBites$ = of([]);
  myBitesSorting$ = of('distance');
  sortedRestaurantBites$ = of([]);
  restaurantBitesSorting$ = of('createdAt');
  weeklyBitesSorting$ = of('createdAt');
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
  hasErrorLoadingBites$ = of(false);
  locationPermissionState$ = of(undefined);
  position$ = of(undefined);
  biteIdFromUrl = (): string | undefined => undefined;
  restaurantIdFromUrl = (): string | undefined => undefined;
  weekRangeFromUrl = (): { weekStart: number; weekEnd: number } | undefined =>
    undefined;
  likes$ = of([]);
  logout = (): null => null;
  submitLikeClick = (): null => null;
  notifyLikesLoaded = jest.fn();
  submitDeleteBite = (): null => null;
  saveEditedBite = (): null => null;
  setHomeSorting = (): null => null;
  setMyBitesSorting = (): null => null;
  setRestaurantBitesSorting = (): null => null;
  setWeeklyBitesSorting = (): null => null;
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
  weeklyBites: jest.fn(),
};

describe('HomeDataAccessService', () => {
  let biteTribeStoreService: BiteTribeStoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    ApiMock.biteById.mockResolvedValue(undefined);
    ApiMock.bitesByPosition.mockResolvedValue([]);
    ApiMock.loadRestaurant.mockResolvedValue(undefined);
    ApiMock.loadLikesForBites.mockResolvedValue([]);
    ApiMock.weeklyBites.mockResolvedValue(undefined);

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

  describe('updateBiteRating', () => {
    it('should save the bite with the updated rating', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const saveEditedBiteSpy = jest.spyOn(
          biteTribeStoreService,
          'saveEditedBite',
        );

        service.updateBiteRating({ bite: BITE_WITH_POSITION, rating: 4 });

        expect(saveEditedBiteSpy).toHaveBeenCalledWith({
          ...BITE_WITH_POSITION,
          rating: 4,
        });
      },
    ));
  });

  describe('location permissions', () => {
    it('should delegate reading the permission state', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        getLocationPermissionStateMock.mockResolvedValue('prompt');

        await expect(service.getLocationPermissionState()).resolves.toBe(
          'prompt',
        );
        expect(getLocationPermissionStateMock).toHaveBeenCalledTimes(1);
      },
    ));

    it('should delegate requesting location permission', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        requestLocationPermissionMock.mockResolvedValue('granted');

        await expect(service.requestLocationPermission()).resolves.toBe(
          'granted',
        );
        expect(requestLocationPermissionMock).toHaveBeenCalledTimes(1);
      },
    ));

    it('should delegate opening location settings', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        openLocationSettingsMock.mockResolvedValue(true);

        await expect(service.openLocationSettings()).resolves.toBe(true);
        expect(openLocationSettingsMock).toHaveBeenCalledTimes(1);
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
        jest
          .spyOn(service, 'selectedBucketlist')
          .mockReturnValue(SELECTED_BUCKETLIST);
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
        jest
          .spyOn(service, 'selectedBucketlist')
          .mockReturnValue(SELECTED_BUCKETLIST);
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
        jest.spyOn(service, 'selectedBucketlist').mockReturnValue(undefined);
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
        const setBiteTriedOutStatusSpy = jest.spyOn(
          biteTribeStoreService,
          'setBiteTriedOutStatus',
        );

        service.markBiteAsTriedOut({ biteId: 'bite-1', checked: true });

        expect(setBiteTriedOutStatusSpy).not.toHaveBeenCalled();
      },
    ));
  });

  describe('triedOutBiteIds', () => {
    it('should return the bite ids marked as tried out', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        jest.spyOn(service, 'selectedBucketlist').mockReturnValue({
          ...SELECTED_BUCKETLIST,
          triedOutBites: [
            { biteId: 'bite-1', date: '2026-04-20', timestamp: 1 },
            { biteId: 'bite-2', date: '2026-04-21', timestamp: 2 },
          ],
        });

        expect(service.triedOutBiteIds()).toEqual(['bite-1', 'bite-2']);
      },
    ));
  });

  describe('restaurantBitesLoader', () => {
    it('should return empty array when no sourceBiteId', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: undefined, restaurantIdOrName: undefined },
          }),
        );
        expect(result).toEqual([]);
      },
    ));

    it('should return empty array when biteById throws', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockRejectedValue(new Error('not found'));
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'id1', restaurantIdOrName: undefined },
          }),
        );
        expect(result).toEqual([]);
      },
    ));

    it('should return empty array when source bite has no position', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue({ id: 'id1' } as Bite);
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'id1', restaurantIdOrName: undefined },
          }),
        );
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
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'id1', restaurantIdOrName: undefined },
          }),
        );
        expect(result).toEqual([]);
      },
    ));

    it('should return only source bite when bitesByPosition throws', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockRejectedValue(new Error('network error'));
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
          }),
        );
        expect(result).toEqual([BITE_WITH_POSITION]);
      },
    ));

    it('should call bitesByPosition with source bite coordinates', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([]);
        await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: 'place123' },
          }),
        );
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

        await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
          }),
        );
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
        await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: undefined, restaurantIdOrName: undefined },
          }),
        );

        expect(ApiMock.loadLikesForBites).not.toHaveBeenCalled();
      },
    ));

    it('should ignore errors while seeding likes', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([]);
        ApiMock.loadLikesForBites.mockRejectedValue(new Error('network error'));

        await expect(
          service.restaurantBitesLoader(
            createLoaderParams({
              params: {
                sourceBiteId: 'biteId',
                restaurantIdOrName: undefined,
              },
            }),
          ),
        ).resolves.toEqual([BITE_WITH_POSITION]);
        await Promise.resolve();

        expect(biteTribeStoreService.notifyLikesLoaded).not.toHaveBeenCalled();
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
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: 'TestPlace' },
          }),
        );
        expect(result[0]).toEqual(BITE_WITH_POSITION);
      },
    ));

    it('should filter out nearby bites that have no position', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const biteNoPosition: Partial<Bite> = {
          ...BITE_WITH_POSITION,
          id: 'noPos',
          position: undefined,
        };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([biteNoPosition]);
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
          }),
        );
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
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: 'r1' },
          }),
        );
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
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: 'r1' },
          }),
        );
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
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: {
              sourceBiteId: 'biteId',
              restaurantIdOrName: 'myrestaurant',
            },
          }),
        );
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
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: {
              sourceBiteId: 'biteId',
              restaurantIdOrName: 'uniqueplace',
            },
          }),
        );
        expect(result).toContain(restaurantIdBite);
      },
    ));

    it('should return all close bites when no restaurantIdOrName is provided', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        const nearbyBite: Bite = { ...BITE_WITH_POSITION, id: 'nearby1' };
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([nearbyBite]);
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
          }),
        );
        expect(result).toContain(nearbyBite);
      },
    ));

    it('should not prepend source bite when it is already in matched list', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.biteById.mockResolvedValue(BITE_WITH_POSITION);
        ApiMock.bitesByPosition.mockResolvedValue([BITE_WITH_POSITION]);
        const result = await service.restaurantBitesLoader(
          createLoaderParams({
            params: { sourceBiteId: 'biteId', restaurantIdOrName: undefined },
          }),
        );
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
          });
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
      const like: Like = {
        biteId: BITE_WITH_POSITION.id,
        userId: 'test-user-id',
        likeType: 'thumbup',
        createdAt: '2026-01-01T00:00:00Z',
      };

      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.likes$ = of([like]);
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

  describe('restaurantBitesLoading', () => {
    it('should reflect the resource loading state', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        jest
          .spyOn(service.restaurantBitesResource, 'isLoading')
          .mockReturnValue(true);

        expect(service.restaurantBitesLoading()).toBe(true);
      },
    ));
  });

  describe('weeklyBitesLoader', () => {
    const WEEK = { weekStart: 1752444000000, weekEnd: 1753048799999 };

    it('should ask the api for the week the deep link carries', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.weeklyBites.mockResolvedValue({ ...WEEK, bites: [] });

        await service.weeklyBitesLoader(createWeeklyLoaderParams(WEEK));

        expect(ApiMock.weeklyBites).toHaveBeenCalledWith(WEEK);
      },
    ));

    it('should ask without a range when the page was opened without one', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.weeklyBites.mockResolvedValue({ ...WEEK, bites: [] });

        await service.weeklyBitesLoader(createWeeklyLoaderParams(undefined));

        expect(ApiMock.weeklyBites).toHaveBeenCalledWith(undefined);
      },
    ));

    it('should seed the likes of the loaded bites', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.weeklyBites.mockResolvedValue({
          ...WEEK,
          bites: [BITE_WITH_POSITION],
        });

        await service.weeklyBitesLoader(createWeeklyLoaderParams(WEEK));

        expect(ApiMock.loadLikesForBites).toHaveBeenCalledWith(
          [BITE_WITH_POSITION],
          'test-user-id',
        );
      },
    ));

    it('should fall back to an empty week when the call fails', inject(
      [HomeDataAccessService],
      async (service: HomeDataAccessService) => {
        ApiMock.weeklyBites.mockResolvedValue(undefined);

        const result = await service.weeklyBitesLoader(
          createWeeklyLoaderParams(WEEK),
        );

        expect(result).toEqual({ weekStart: 0, weekEnd: 0, bites: [] });
      },
    ));
  });

  describe('weeklyBites', () => {
    const WEEK = { weekStart: 1752444000000, weekEnd: 1753048799999 };

    describe('given the current user liked a loaded bite', () => {
      const like: Like = {
        biteId: BITE_WITH_POSITION.id,
        userId: 'test-user-id',
        likeType: 'thumbup',
        createdAt: '2026-01-01T00:00:00Z',
      };

      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.likes$ = of([like]);
        },
      ));

      it('should decorate the loaded bites with likes', inject(
        [HomeDataAccessService],
        (service: HomeDataAccessService) => {
          service.weeklyBitesResource.set({
            ...WEEK,
            bites: [BITE_WITH_POSITION],
          });

          expect(service.weeklyBites()[0].likes).toEqual([like]);
        },
      ));
    });

    it('should expose the week the backend resolved', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        service.weeklyBitesResource.set({ ...WEEK, bites: [] });

        expect(service.weeklyBitesRange()).toEqual(WEEK);
      },
    ));

    it('should report no week before the first load answered', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        // The default value carries no week, and labelling the page with a
        // guessed range would be worse than showing none.
        expect(service.weeklyBitesRange()).toBeUndefined();
      },
    ));
  });
});

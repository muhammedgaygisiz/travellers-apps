import { inject, TestBed } from '@angular/core/testing';
import { HomeDataAccessService } from '../home-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import type { Bite, Like } from 'model';
import { provideMockStore } from '@ngrx/store/testing';
import SpyInstance = jest.SpyInstance;

class Mock {
  sortedHomeBites$ = of([]);
  homeSorting$ = of('distance');
  mybites$ = of([]);
  sortedMyBites$ = of([]);
  myBitesSorting$ = of('distance');
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
  logout = (): null => null;
  submitLikeOrDislikeClick = (): null => null;
  submitDeleteBite = (): null => null;
  setHomeSorting = (): null => null;
  setMyBitesSorting = (): null => null;
  setHomeFilters = (): null => null;
  clearHomeFilters = (): null => null;
  reloadGPSPosition = (): null => null;
  clearGpsError = (): null => null;
}

describe('HomeDataAccessService', () => {
  let biteTribeStoreService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HomeDataAccessService,
        provideMockStore(),
        { provide: BiteTribeStoreService, useClass: Mock },
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
    const likeType = { likeType: 'dislike', biteId: '456' };
    const like = {
      biteId: likeType.biteId,
      userId: 'userId',
      likeType: likeType.likeType,
    } as unknown as Like;
    const bite = {
      id: like.biteId,
      userId: like.userId,
      likes: [like],
    } as Bite;
    let submitLikeOrDislikeClickSpy: SpyInstance;

    beforeEach(inject(
      [BiteTribeStoreService],
      (storeService: BiteTribeStoreService) => {
        storeService.sortedHomeBites$ = of([bite]);
        storeService.userId$ = of('userId');
        submitLikeOrDislikeClickSpy = jest
          .spyOn(storeService, 'submitLikeOrDislikeClick')
          .mockImplementation();
      },
    ));

    it('should call submitLikeOrDislikeClick when bite is found', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const likeClick = { likeType: 'like', biteId: '456' };

        service.submitLikeClick(likeClick);

        expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledTimes(1);
        expect(
          biteTribeStoreService.submitLikeOrDislikeClick,
        ).toHaveBeenCalledWith(bite, 'userId', likeClick);
      },
    ));

    it('should call submitLikeOrDislikeClick with undefined bite when bite is not found', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const likeClick = { likeType: 'like', biteId: 'nonexistent-bite-id' };

        service.submitLikeClick(likeClick);

        expect(
          biteTribeStoreService.submitLikeOrDislikeClick,
        ).toHaveBeenCalledTimes(1);
        expect(
          biteTribeStoreService.submitLikeOrDislikeClick,
        ).toHaveBeenCalledWith(undefined, 'userId', likeClick);
      },
    ));

    describe('with empty bites', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.sortedHomeBites$ = of([]);
        },
      ));

      it('should handle empty bites array', inject(
        [HomeDataAccessService],
        (service: HomeDataAccessService) => {
          const likeClick = { likeType: 'like', biteId: '456' };

          service.submitLikeClick(likeClick);

          expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledWith(
            undefined,
            'userId',
            likeClick,
          );
        },
      ));
    });

    describe('with no bites', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.sortedHomeBites$ = of(undefined as any);
        },
      ));

      it('should handle empty bites array', inject(
        [HomeDataAccessService],
        (service: HomeDataAccessService) => {
          const likeClick = { likeType: 'like', biteId: '456' };

          service.submitLikeClick(likeClick);

          expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledWith(
            undefined,
            'userId',
            likeClick,
          );
        },
      ));
    });

    describe('with no user id', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.userId$ = of('');
        },
      ));

      it('should not call submitLikeOrDislikeClick', inject(
        [HomeDataAccessService],
        (service: HomeDataAccessService) => {
          const likeClick = { likeType: 'like', biteId: '456' };

          service.submitLikeClick(likeClick);

          expect(submitLikeOrDislikeClickSpy).not.toHaveBeenCalled();
        },
      ));
    });
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
});

import { inject, TestBed } from '@angular/core/testing';
import { HomeDataAccessService } from '../home-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { Bite, Like } from 'model';
import { provideMockStore } from '@ngrx/store/testing';
import SpyInstance = jest.SpyInstance;

class Mock {
  sortedHomeBites$ = of([]);
  homeSorting$ = of('distance');
  mybites$ = of([]);
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
  isReloadingBites$ = of(false);
  logout = (): null => null;
  submitLikeClick = (): null => null;
  submitDeleteBite = (): null => null;
  setHomeSorting = (): null => null;
  setHomeFilters = (): null => null;
  clearHomeFilters = (): null => null;
  reloadBites = (): null => null;
  removeLike = (): null => null;
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
    }
  ));

  describe('logout', () => {
    it('should call logout on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const logoutSpy = jest.spyOn(biteTribeStoreService, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      }
    ));
  });

  describe('submitLikeClick', () => {
    let removeLikeSpy: SpyInstance;
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

    beforeEach(inject(
      [BiteTribeStoreService],
      (storeService: BiteTribeStoreService) => {
        removeLikeSpy = jest
          .spyOn(biteTribeStoreService, 'removeLike')
          .mockImplementation();
        storeService.sortedHomeBites$ = of([bite]);
        storeService.userId$ = of('userId');
      }
    ));

    it('should call submitLikeClick on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const likeType = { likeType: 'like', biteId: '123' };
        const submitLikeClickSpy = jest.spyOn(
          biteTribeStoreService,
          'submitLikeClick'
        );
        service.submitLikeClick(likeType);
        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeType);
      }
    ));

    it('should call submitLikeClick with correct arguments', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        service.submitLikeClick(likeType);
        expect(removeLikeSpy).toHaveBeenCalledWith(likeType);
      }
    ));
  });

  describe('deleteBite', () => {
    it('should call deleteBite on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const submitDeleteBiteSpy = jest.spyOn(
          biteTribeStoreService,
          'submitDeleteBite'
        );
        service.deleteBite({} as Bite);
        expect(submitDeleteBiteSpy).toHaveBeenCalledTimes(1);
      }
    ));
  });

  describe('setHomeSorting', () => {
    it('should call setHomeSorting on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const setHomeSortingSpy = jest.spyOn(
          biteTribeStoreService,
          'setHomeSorting'
        );
        service.setHomeSorting('sorting');
        expect(setHomeSortingSpy).toHaveBeenCalledTimes(1);
        expect(setHomeSortingSpy).toHaveBeenCalledWith('sorting');
      }
    ));
  });

  describe('setFilters', () => {
    it('should call setFilters on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const setHomeFiltersSpy = jest.spyOn(
          biteTribeStoreService,
          'setHomeFilters'
        );
        const filters = {
          tagFilters: ['tagFilters'],
          distanceFilter: 'distanceFilter',
          priceFilter: 123,
        };
        service.setFilters(filters);
        expect(setHomeFiltersSpy).toHaveBeenCalledTimes(1);
        expect(setHomeFiltersSpy).toHaveBeenCalledWith(filters);
      }
    ));
  });

  describe('clearFilters', () => {
    it('should call clearFilters on BiteTribeStoreService', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const clearHomeFiltersSpy = jest.spyOn(
          biteTribeStoreService,
          'clearHomeFilters'
        );
        service.clearFilters();
        expect(clearHomeFiltersSpy).toHaveBeenCalledTimes(1);
      }
    ));
  });

  describe('reloadHomeBites', () => {
    it('should call reloadBites', inject(
      [HomeDataAccessService],
      (service: HomeDataAccessService) => {
        const biteTribeStoreServiceSpy = jest.spyOn(
          biteTribeStoreService,
          'reloadBites'
        );
        service.reloadHomeBites();
        expect(biteTribeStoreServiceSpy).toHaveBeenCalledTimes(1);
      }
    ));
  });
});

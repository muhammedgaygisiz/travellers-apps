import { beforeEach, describe, expect, it } from 'vitest';
import { inject, TestBed } from '@angular/core/testing';
import { HomeService } from '../home.service';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite } from 'model';
import { vi, Mock as ViMock } from 'vitest';

class Mock {
  sortedHomeBites = (): never[] => [];
  myBites = (): never[] => [];
  bitesBySelectedBucketlist = (): never[] => [];
  allTags = (): never[] => [];
  homeFilters = (): never[] => [];
  userId = (): string => 'test-user-id';
  isAuthenticated = (): boolean => true;
  isBitesLoading = (): boolean => false;
  selectedBucketlist = (): null => null;
  navigateForward = (): null => null;
  logout = (): null => null;
  submitLikeClick = (): null => null;
  deleteBite = (): null => null;
  exchangeRates = (): null => null;
  setHomeSorting = (): null => null;
  setMyBitesSorting = (): null => null;
  selectedBucketlistTitle = (): null => null;
  reloadGPSPosition = (): null => null;
  setFilters = (): null => null;
  clearFilters = (): null => null;
  clearGpsError = (): null => null;
}

describe('HomeService', () => {
  let homeDataAccessService: HomeDataAccessService;
  let navController: NavController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HomeDataAccessService, useClass: Mock },
        { provide: NavController, useClass: Mock },
      ],
    }).compileComponents();
    homeDataAccessService = TestBed.inject(HomeDataAccessService);
    navController = TestBed.inject(NavController);
  });

  it('should create the service', inject(
    [HomeService],
    (service: HomeService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('bitesBySelectedBucketlist', () => {
    it('should return empty array if selectedBucketlist is empty array', inject(
      [HomeService],
      (service: HomeService) => {
        const result = service.bitesBySelectedBucketlist();
        expect(result).toEqual([]);
      },
    ));
  });

  describe('logout', () => {
    let logoutSpy: ViMock;

    beforeEach(() => {
      logoutSpy = vi.spyOn(homeDataAccessService, 'logout');
    });

    it('should call logout on HomeDataAccessService', inject(
      [HomeService],
      (service: HomeService) => {
        service.logout();
        expect(logoutSpy).toHaveBeenCalled();
      },
    ));
  });

  describe('likeButtonClicked', () => {
    let submitLikeClickSpy: ViMock;

    beforeEach(() => {
      submitLikeClickSpy = vi.spyOn(homeDataAccessService, 'submitLikeClick');
    });

    it('should call likeButtonClicked on HomeDataAccessService with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const param = { likeType: 'likeType', biteId: 'biteId' };
        service.likeButtonClicked(param);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(param);
      },
    ));
  });

  describe('biteClicked', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to bite page with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const bite = { id: 'bite-id', restaurantId: 'restaurant-id' } as Bite;
        service.biteClicked(bite);
        expect(navigateForwardSpy).toHaveBeenCalledWith(['bite', bite.id]);
      },
    ));
  });

  describe('onDeleteBiteClick', () => {
    let deleteBiteSpy: ViMock;

    beforeEach(() => {
      deleteBiteSpy = vi.spyOn(homeDataAccessService, 'deleteBite');
    });

    it('should call deleteBite on HomeDataAccessService with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const bite = { id: 'bite-id' } as Bite;
        service.onDeleteBiteClick(bite);
        expect(deleteBiteSpy).toHaveBeenCalledWith(bite);
      },
    ));
  });

  describe('restaurantClicked', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to restaurant page with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const bite = { restaurantId: 'restaurant/test/123' } as Bite;
        service.restaurantClicked(bite);
        expect(navigateForwardSpy).toHaveBeenCalledWith([
          'bite',
          bite.id,
          'restaurant',
          '123',
        ]);
      },
    ));
  });

  describe('onAddButtonClicked', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onAddButtonClicked();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['new-bite']);
      },
    ));
  });

  describe('onGotoSettingsClick', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoSettingsClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['settings']);
      },
    ));
  });

  describe('onGotoMyBitesClick', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMyBitesClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['my-bites']);
      },
    ));
  });

  describe('onGotoMyBucketlists', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMyBucketlists();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['my-bucketlists']);
      },
    ));
  });

  describe('onGotoEditClick', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        const biteToEdit = { id: 'bite-id' } as Bite;
        service.onGotoEditClick(biteToEdit);
        expect(navigateForwardSpy).toHaveBeenCalledWith([
          'bite',
          'bite-id',
          'edit',
        ]);
      },
    ));
  });

  describe('openMapView', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
      vi.spyOn(homeDataAccessService, 'selectedBucketlist').mockReturnValue({
        id: '1',
      } as any);
    });

    it('should navigate to map view with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        service.openMapView('my-bucketlists');
        expect(navigateForwardSpy).toHaveBeenCalledWith([
          'my-bucketlists',
          '1',
          'map-view',
        ]);
      },
    ));

    it('should navigate to any other route without params', inject(
      [HomeService],
      (service: HomeService) => {
        service.openMapView('home');
        expect(navigateForwardSpy).toHaveBeenCalledWith(['home', 'map-view']);
      },
    ));
  });

  describe('sortingChange', () => {
    let setHomeSortingSpy: ViMock;

    beforeEach(() => {
      setHomeSortingSpy = vi.spyOn(homeDataAccessService, 'setHomeSorting');
    });

    it('should call setHomeSorting', inject(
      [HomeService],
      (service: HomeService) => {
        service.sortingChange('distance');

        expect(setHomeSortingSpy).toHaveBeenCalledWith('distance');
      },
    ));
  });

  describe('myBitesSortingChange', () => {
    let setMyBitesSortingSpy: ViMock;

    beforeEach(() => {
      setMyBitesSortingSpy = vi.spyOn(
        homeDataAccessService,
        'setMyBitesSorting',
      );
    });

    it('should call setHomeSorting', inject(
      [HomeService],
      (service: HomeService) => {
        service.myBitesSortingChange('distance');

        expect(setMyBitesSortingSpy).toHaveBeenCalledWith('distance');
      },
    ));
  });

  describe('myBites', () => {
    let myBitesSpy: ViMock;

    beforeEach(() => {
      myBitesSpy = vi
        .spyOn(homeDataAccessService, 'myBites')
        .mockReturnValue([]);
    });

    it('should return bites for the current user', inject(
      [HomeService],
      (service: HomeService) => {
        const bites = [{ id: '1', userId: 'test-user-id' }];
        myBitesSpy.mockReturnValue(bites);

        const result = service.myBites();
        expect(result).toEqual([bites[0]]);
      },
    ));
  });

  describe('selectedBucketlistTitle', () => {
    let selectedBucketlistSpy: ViMock;

    beforeEach(() => {
      selectedBucketlistSpy = vi
        .spyOn(homeDataAccessService, 'selectedBucketlistTitle')
        .mockReturnValue(null as any);
    });

    it('should return My Bucketlist string if selectedBucketlist is null', inject(
      [HomeService],
      (service: HomeService) => {
        selectedBucketlistSpy.mockReturnValue('My Bucketlist');
        const result = service.selectedBucketlistTitle();
        expect(result).toBe('My Bucketlist');
      },
    ));

    it('should return title of the selected bucketlist', inject(
      [HomeService],
      (service: HomeService) => {
        const bucketlistTitle = 'My Bucketlist';
        selectedBucketlistSpy.mockReturnValue(bucketlistTitle);

        const result = service.selectedBucketlistTitle();
        expect(result).toBe(bucketlistTitle);
      },
    ));
  });

  describe('filtersChanged', () => {
    let setFiltersSpy: ViMock;

    beforeEach(() => {
      setFiltersSpy = vi
        .spyOn(homeDataAccessService, 'setFilters')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should call setHomeFilters with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const filters = {
          priceFilter: 10,
          distanceFilter: '50',
          tagFilters: ['tag1', 'tag2'],
        };
        service.filtersChanged(filters);
        expect(setFiltersSpy).toHaveBeenCalledWith(filters);
      },
    ));
  });

  describe('filtersCleared', () => {
    let clearFiltersSpy: ViMock;

    beforeEach(() => {
      clearFiltersSpy = vi
        .spyOn(homeDataAccessService, 'clearFilters')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .mockImplementation(() => {});
    });

    it('should call setHomeFilters with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        service.filtersCleared();
        expect(clearFiltersSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('refresh', () => {
    let reloadHomeBitesSpy: ViMock;

    beforeEach(() => {
      reloadHomeBitesSpy = vi.spyOn(homeDataAccessService, 'reloadGPSPosition');
    });

    it('should emit refresh', inject([HomeService], (service: HomeService) => {
      service.refresh();
      expect(reloadHomeBitesSpy).toHaveBeenCalledTimes(1);
    }));
  });

  describe('closeGpsError', () => {
    let clearGpsErrorSpy: ViMock;

    beforeEach(() => {
      clearGpsErrorSpy = vi.spyOn(homeDataAccessService, 'clearGpsError');
    });

    it('should call clearGpsError on HomeDataAccessService', inject(
      [HomeService],
      (service: HomeService) => {
        service.closeGpsError();
        expect(clearGpsErrorSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('onGotoMyProfileClick', () => {
    let navigateForwardSpy: ViMock;

    beforeEach(() => {
      navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
    });

    it('should navigate to my-profile page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMyProfileClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['my-profile']);
      },
    ));
  });
});

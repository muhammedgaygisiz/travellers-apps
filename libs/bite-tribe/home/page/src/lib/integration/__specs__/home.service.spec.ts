import { inject, TestBed } from '@angular/core/testing';
import { HomeService } from '../home.service';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite } from 'model';
import SpyInstance = jest.SpyInstance;

const sortBitesByDistanceMock = jest.fn();
jest.mock('../../utils/sort-bites-by-distance', () => ({
  sortBitesByDistance: (): void => sortBitesByDistanceMock(),
}));

const sortBitesByLikesMock = jest.fn();
jest.mock('../../utils/sort-bites-by-likes', () => ({
  sortBitesByLikes: (): void => sortBitesByLikesMock(),
}));

const sortBitesByCreatedAtMock = jest.fn();
jest.mock('../../utils/sort-bites-by-created-at', () => ({
  sortBitesByCreatedAt: (): void => sortBitesByCreatedAtMock(),
}));

const sortBitesByRatingMock = jest.fn();
jest.mock('../../utils/sort-bites-by-rating', () => ({
  sortBitesByRating: (): void => sortBitesByRatingMock(),
}));

class Mock {
  bites = () => [];
  allTags = () => [];
  homeFilters = () => [];
  userId = () => 'test-user-id';
  isAuthenticated = () => true;
  isBitesLoading = () => false;
  selectedBucketlist = () => null;
  navigateForward = () => null;
  logout = () => null;
  submitLikeClick = () => null;
  deleteBite = () => null;
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
    }
  ));

  describe('bitesBySelectedBucketlist', () => {
    let bitesSpy: SpyInstance;
    let selectedBucketlistSpy: SpyInstance;

    beforeEach(() => {
      bitesSpy = jest.spyOn(homeDataAccessService, 'bites').mockReturnValue([]);
      selectedBucketlistSpy = jest
        .spyOn(homeDataAccessService, 'selectedBucketlist')
        .mockReturnValue(null as any);
    });

    it('should return empty array if selectedBucketlist is null', inject(
      [HomeService],
      (service: HomeService) => {
        const result = service.bitesBySelectedBucketlist();
        expect(result).toEqual([]);
      }
    ));

    it('should return bites filtered by selectedBucketlist', inject(
      [HomeService],
      (service: HomeService) => {
        const bites = [
          { id: '1', userId: 'test-user-id' },
          { id: '2', userId: 'other-user-id' },
        ];
        bitesSpy.mockReturnValue(bites);
        selectedBucketlistSpy.mockReturnValue({
          biteIds: ['1'],
        } as any);

        const result = service.bitesBySelectedBucketlist();
        expect(result).toEqual([bites[0]]);
      }
    ));
  });

  describe('sortedBites', () => {
    let bitesSpy: SpyInstance;

    beforeEach(() => {
      bitesSpy = jest.spyOn(homeDataAccessService, 'bites').mockReturnValue([]);
    });

    it('should return bites as provided if sorting is missing', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set(undefined as any);
        const bites = [
          { id: '1', distance: 10 },
          { id: '2', distance: 5 },
        ];

        bitesSpy.mockReturnValue(bites);

        const result = service.sortedBites();
        expect(result).toEqual(bites);
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
      }
    ));

    it('should return bites as provided if bites are missing', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set('distance');
        const bites = undefined as any;

        bitesSpy.mockReturnValue(bites);

        const result = service.sortedBites();
        expect(result).toEqual(bites);
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
      }
    ));

    it('should return bites as provided if sorting is unknown', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set('test');
        const bites = undefined as any;

        bitesSpy.mockReturnValue(bites);

        const result = service.sortedBites();
        expect(result).toEqual(bites);
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
        expect(sortBitesByDistanceMock).not.toHaveBeenCalled();
      }
    ));

    it('should return bites sorted by distance when sorting is "distance"', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set('distance');
        const bites = [
          { id: '1', distance: 10 },
          { id: '2', distance: 5 },
        ];

        bitesSpy.mockReturnValue(bites);

        service.sortedBites();
        expect(sortBitesByDistanceMock).toHaveBeenCalledTimes(1);
      }
    ));

    it('should return bites sorted by likes when sorting is "likes"', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set('likes');
        const bites = [
          { id: '1', likes: [{ userId: 'user1' }, { userId: 'user2' }] },
          {
            id: '2',
            likes: [
              { userId: 'user1' },
              { userId: 'user2' },
              { userId: 'user3' },
            ],
          },
        ];
        bitesSpy.mockReturnValue(bites);

        service.sortedBites();
        expect(sortBitesByLikesMock).toHaveBeenCalledTimes(1);
      }
    ));

    it('should return bites sorted by likes when sorting is "rating"', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set('rating');
        const bites = [
          { id: '1', rating: 2 },
          { id: '2', rating: 5 },
        ];
        bitesSpy.mockReturnValue(bites);

        service.sortedBites();
        expect(sortBitesByRatingMock).toHaveBeenCalledTimes(1);
      }
    ));

    it('should return bites sorted by createdAt when sorting is "createdAt"', inject(
      [HomeService],
      (service: HomeService) => {
        service.sorting.set('createdAt');
        const bites = [
          { id: '1', createdAt: new Date(2023, 0, 1) },
          { id: '2', createdAt: new Date(2023, 0, 2) },
        ];
        bitesSpy.mockReturnValue(bites);

        service.sortedBites();
        expect(sortBitesByCreatedAtMock).toHaveBeenCalledTimes(1);
      }
    ));
  });

  describe('logout', () => {
    let logoutSpy: SpyInstance;

    beforeEach(() => {
      logoutSpy = jest.spyOn(homeDataAccessService, 'logout');
    });

    it('should call logout on HomeDataAccessService', inject(
      [HomeService],
      (service: HomeService) => {
        service.logout();
        expect(logoutSpy).toHaveBeenCalled();
      }
    ));
  });

  describe('likeButtonClicked', () => {
    let submitLikeClickSpy: SpyInstance;

    beforeEach(() => {
      submitLikeClickSpy = jest.spyOn(homeDataAccessService, 'submitLikeClick');
    });

    it('should call likeButtonClicked on HomeDataAccessService with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const param = { likeType: 'likeType', biteId: 'biteId' };
        service.likeButtonClicked(param);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(param);
      }
    ));
  });

  describe('biteClicked', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to bite page with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const bite = { id: 'bite-id', restaurantId: 'restaurant-id' } as Bite;
        service.biteClicked(bite);
        expect(navigateForwardSpy).toHaveBeenCalledWith(['bite', bite.id]);
      }
    ));
  });

  describe('onDeleteBiteClick', () => {
    let deleteBiteSpy: SpyInstance;

    beforeEach(() => {
      deleteBiteSpy = jest.spyOn(homeDataAccessService, 'deleteBite');
    });

    it('should call deleteBite on HomeDataAccessService with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const bite = { id: 'bite-id' } as Bite;
        service.onDeleteBiteClick(bite);
        expect(deleteBiteSpy).toHaveBeenCalledWith(bite);
      }
    ));
  });

  describe('restaurantClicked', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
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
      }
    ));
  });

  describe('onAddButtonClicked', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onAddButtonClicked();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['new-bite']);
      }
    ));
  });

  describe('onGotoSettingsClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoSettingsClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['settings']);
      }
    ));
  });

  describe('onGotoMyBitesClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMyBitesClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['my-bites']);
      }
    ));
  });

  describe('onGotoMyBucketlists', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to new bite page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMyBucketlists();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['my-bucketlists']);
      }
    ));
  });

  describe('onGotoEditClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
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
      }
    ));
  });

  describe('openMapView', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
      jest.spyOn(homeDataAccessService, 'selectedBucketlist').mockReturnValue({
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
      }
    ));

    it('should navigate to any other route without params', inject(
      [HomeService],
      (service: HomeService) => {
        service.openMapView('home');
        expect(navigateForwardSpy).toHaveBeenCalledWith(['home', 'map-view']);
      }
    ));
  });

  describe('sortingChange', () => {
    let sortingSpy: SpyInstance;

    beforeEach(inject([HomeService], (service: HomeService) => {
      sortingSpy = jest.spyOn(service.sorting, 'set').mockImplementation();
    }));

    it('should set the sorting value', inject(
      [HomeService],
      (service: HomeService) => {
        service.sortingChange('distance');
        expect(sortingSpy).toHaveBeenCalledWith('distance');
      }
    ));
  });
});

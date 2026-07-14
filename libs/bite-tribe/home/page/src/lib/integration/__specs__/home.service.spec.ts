import { inject, TestBed } from '@angular/core/testing';
import { HomeService } from '../home.service';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite, Like } from 'model';
import SpyInstance = jest.SpyInstance;
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

class Mock {
  sortedHomeBites = (): never[] => [];
  myBites = (): never[] => [];
  restaurantBites = (): never[] => [];
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
  setRestaurantBitesSorting = (): null => null;
  selectedBucketlistTitle = (): null => null;
  reloadGPSPosition = (): null => null;
  setFilters = (): null => null;
  clearFilters = (): null => null;
  clearGpsError = (): null => null;
  triedOutBiteIds = (): string[] => [];
  markBiteAsTriedOut = (): null => null;
  emailVerificationPromptVisible = (): boolean => false;
  resendEmailVerification = jest.fn().mockResolvedValue(undefined);
}

class AnalyticsMock {
  logEvent = jest.fn();
}

class ToastControllerMock {
  create = jest.fn().mockResolvedValue({ present: jest.fn() });
}

class TranslocoMock {
  translate = jest.fn((key: string) => key);
}

describe('HomeService', () => {
  let homeDataAccessService: HomeDataAccessService;
  let navController: NavController;
  let toastController: ToastController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HomeDataAccessService, useClass: Mock },
        { provide: NavController, useClass: Mock },
        { provide: AnalyticsService, useClass: AnalyticsMock },
        { provide: ToastController, useClass: ToastControllerMock },
        { provide: TranslocoService, useClass: TranslocoMock },
      ],
    }).compileComponents();
    homeDataAccessService = TestBed.inject(HomeDataAccessService);
    navController = TestBed.inject(NavController);
    toastController = TestBed.inject(ToastController);
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
    let logoutSpy: SpyInstance;

    beforeEach(() => {
      logoutSpy = jest.spyOn(homeDataAccessService, 'logout');
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
    let submitLikeClickSpy: SpyInstance;

    beforeEach(() => {
      submitLikeClickSpy = jest.spyOn(homeDataAccessService, 'submitLikeClick');
    });

    it('should call likeButtonClicked on HomeDataAccessService with correct parameters', inject(
      [HomeService],
      (service: HomeService) => {
        const param = {
          likeType: 'likeType',
          biteId: 'biteId',
        } as unknown as Like;
        service.likeButtonClicked(param);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(param);
      },
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
      },
    ));
  });

  describe('onGotoLeaderboardClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to leaderboard', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoLeaderboardClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['leaderboard']);
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
    ));
  });

  describe('gotoAboutClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to about page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoAboutClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['about']);
      },
    ));
  });

  describe('onGotoMarketPlaceClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to market-place page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMarketPlaceClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['market-place']);
      },
    ));
  });

  describe('onGotoSearchClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to search page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoSearchClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['search']);
      },
    ));
  });

  describe('onGotoGalleryClick', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to gallery page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoGalleryClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['gallery']);
      },
    ));
  });

  describe('openMapView', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
      jest.spyOn(homeDataAccessService, 'selectedBucketlist').mockReturnValue({
        id: '1',
      } as never);
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

  describe('onMenuNavigate', () => {
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it.each([
      ['settings', ['settings']],
      ['profile', ['my-profile']],
      ['my-bites', ['my-bites']],
      ['my-bucketlists', ['my-bucketlists']],
      ['about', ['about']],
      ['market-place', ['market-place']],
      ['gallery', ['gallery']],
      ['leaderboard', ['leaderboard']],
    ] as const)('should navigate for menu target %s', (target, route) => {
      const service = TestBed.inject(HomeService);

      service.onMenuNavigate(target);

      expect(navigateForwardSpy).toHaveBeenCalledWith(route);
    });
  });

  describe('sortingChange', () => {
    let setHomeSortingSpy: SpyInstance;

    beforeEach(() => {
      setHomeSortingSpy = jest.spyOn(homeDataAccessService, 'setHomeSorting');
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
    let setMyBitesSortingSpy: SpyInstance;

    beforeEach(() => {
      setMyBitesSortingSpy = jest.spyOn(
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

  describe('restaurantBitesSortingChange', () => {
    let setRestaurantBitesSortingSpy: SpyInstance;

    beforeEach(() => {
      setRestaurantBitesSortingSpy = jest.spyOn(
        homeDataAccessService,
        'setRestaurantBitesSorting',
      );
    });

    it('should call setRestaurantBitesSorting', inject(
      [HomeService],
      (service: HomeService) => {
        service.restaurantBitesSortingChange('createdAt');

        expect(setRestaurantBitesSortingSpy).toHaveBeenCalledWith('createdAt');
      },
    ));
  });

  describe('myBites', () => {
    let myBitesSpy: SpyInstance;

    beforeEach(() => {
      myBitesSpy = jest
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
    let selectedBucketlistSpy: SpyInstance;

    beforeEach(() => {
      selectedBucketlistSpy = jest
        .spyOn(homeDataAccessService, 'selectedBucketlistTitle')
        .mockReturnValue(null as never);
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
    let setFiltersSpy: SpyInstance;

    beforeEach(() => {
      setFiltersSpy = jest
        .spyOn(homeDataAccessService, 'setFilters')
        .mockImplementation();
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
    let clearFiltersSpy: SpyInstance;

    beforeEach(() => {
      clearFiltersSpy = jest
        .spyOn(homeDataAccessService, 'clearFilters')
        .mockImplementation();
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
    let reloadHomeBitesSpy: SpyInstance;

    beforeEach(() => {
      reloadHomeBitesSpy = jest.spyOn(
        homeDataAccessService,
        'reloadGPSPosition',
      );
    });

    it('should emit refresh', inject([HomeService], (service: HomeService) => {
      service.refresh();
      expect(reloadHomeBitesSpy).toHaveBeenCalledTimes(1);
    }));
  });

  describe('closeGpsError', () => {
    let clearGpsErrorSpy: SpyInstance;

    beforeEach(() => {
      clearGpsErrorSpy = jest.spyOn(homeDataAccessService, 'clearGpsError');
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
    let navigateForwardSpy: SpyInstance;

    beforeEach(() => {
      navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
    });

    it('should navigate to my-profile page', inject(
      [HomeService],
      (service: HomeService) => {
        service.onGotoMyProfileClick();
        expect(navigateForwardSpy).toHaveBeenCalledWith(['my-profile']);
      },
    ));
  });

  describe('email verification prompt analytics', () => {
    it('should not log prompt shown when the prompt is hidden', inject(
      [HomeService, AnalyticsService],
      (service: HomeService, analytics: AnalyticsService) => {
        service.trackEmailVerificationPromptShown('home');

        expect(analytics.logEvent).not.toHaveBeenCalledWith(
          AnalyticsEvent.EmailVerificationPromptShown,
          expect.anything(),
        );
      },
    ));

    it('should log prompt shown when the prompt is visible', inject(
      [HomeService, AnalyticsService],
      (service: HomeService, analytics: AnalyticsService) => {
        service.emailVerificationPromptVisible = (): boolean => true;

        service.trackEmailVerificationPromptShown('home');

        expect(analytics.logEvent).toHaveBeenCalledWith(
          AnalyticsEvent.EmailVerificationPromptShown,
          { surface: 'home' },
        );
      },
    ));

    it('should send resend analytics around the backend call', inject(
      [HomeService, AnalyticsService],
      async (service: HomeService, analytics: AnalyticsService) => {
        await service.resendEmailVerification('home');

        expect(analytics.logEvent).toHaveBeenCalledWith(
          AnalyticsEvent.EmailVerificationResendTapped,
          { surface: 'home' },
        );
        expect(analytics.logEvent).toHaveBeenCalledWith(
          AnalyticsEvent.EmailVerificationResendSucceeded,
          { surface: 'home' },
        );
      },
    ));

    it('should log failed resend analytics and show the rate limited toast', inject(
      [HomeService, AnalyticsService],
      async (service: HomeService, analytics: AnalyticsService) => {
        const toast = { present: jest.fn() };
        jest
          .spyOn(homeDataAccessService, 'resendEmailVerification')
          .mockRejectedValue({ message: 'rate_limited' });
        jest.spyOn(toastController, 'create').mockResolvedValue(toast as never);

        await service.resendEmailVerification('home');

        expect(analytics.logEvent).toHaveBeenCalledWith(
          AnalyticsEvent.EmailVerificationResendFailed,
          { surface: 'home', reason: 'rate_limited' },
        );
        expect(toastController.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'please-wait-before-requesting-another-verification-email',
          }),
        );
        expect(toast.present).toHaveBeenCalledTimes(1);
      },
    ));

    it('should show the default resend error toast for unknown failures', inject(
      [HomeService],
      async (service: HomeService) => {
        jest
          .spyOn(homeDataAccessService, 'resendEmailVerification')
          .mockRejectedValue(new Error('boom'));
        const toast = { present: jest.fn() };
        jest.spyOn(toastController, 'create').mockResolvedValue(toast as never);

        await service.resendEmailVerification('home');

        expect(toastController.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'verification-email-could-not-be-sent',
          }),
        );
      },
    ));
  });

  describe('toggleTriedOut', () => {
    let markBiteAsTriedOutSpy: SpyInstance;

    beforeEach(() => {
      markBiteAsTriedOutSpy = jest.spyOn(
        homeDataAccessService,
        'markBiteAsTriedOut',
      );
    });

    it('should call markBiteAsTriedOut on HomeDataAccessService', inject(
      [HomeService],
      (service: HomeService) => {
        const params = {
          biteId: 'bite-id',
          checked: true,
        };

        service.toggleTriedOut(params);

        expect(markBiteAsTriedOutSpy).toHaveBeenCalledWith(params);
      },
    ));
  });
});

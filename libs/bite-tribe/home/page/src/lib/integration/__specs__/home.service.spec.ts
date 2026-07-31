import { inject, TestBed } from '@angular/core/testing';
import { HomeService } from '../home.service';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite, LikeClick } from 'model';
import SpyInstance = jest.SpyInstance;
import { EmailVerificationService } from 'bite-tribe/email-verification-data-access';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';

const biteDataAccessMock = {
  findLocalImageForBite: jest.fn(),
  retryImageUpload: jest.fn().mockResolvedValue(undefined),
};

const localImagePickerMock = {
  pick: jest.fn(),
};

const emailVerificationMock = {
  promptVisible: jest.fn(() => false),
  resendRunning: jest.fn(() => false),
  trackPromptShown: jest.fn(),
  resend: jest.fn().mockResolvedValue(undefined),
};

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
  getLocationPermissionState = async (): Promise<string> => 'granted';
  requestLocationPermission = async (): Promise<string> => 'granted';
  openLocationSettings = async (): Promise<boolean> => true;
}

describe('HomeService', () => {
  let homeDataAccessService: HomeDataAccessService;
  let navController: NavController;

  beforeEach(() => {
    emailVerificationMock.promptVisible.mockReturnValue(false);
    emailVerificationMock.trackPromptShown.mockReset();
    emailVerificationMock.resend.mockReset().mockResolvedValue(undefined);
    biteDataAccessMock.findLocalImageForBite
      .mockReset()
      .mockResolvedValue(undefined);
    biteDataAccessMock.retryImageUpload
      .mockReset()
      .mockResolvedValue(undefined);
    localImagePickerMock.pick.mockReset().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        { provide: HomeDataAccessService, useClass: Mock },
        { provide: NavController, useClass: Mock },
        { provide: EmailVerificationService, useValue: emailVerificationMock },
        { provide: BiteDataAccessService, useValue: biteDataAccessMock },
        { provide: LocalImagePickerService, useValue: localImagePickerMock },
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
        const param: LikeClick = {
          likeType: 'thumbup',
          biteId: 'biteId',
          action: 'save',
        };
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

  describe('enableLocation', () => {
    let stateSpy: SpyInstance;
    let requestSpy: SpyInstance;
    let settingsSpy: SpyInstance;
    let reloadSpy: SpyInstance;
    let clearErrorSpy: SpyInstance;

    beforeEach(() => {
      stateSpy = jest.spyOn(
        homeDataAccessService,
        'getLocationPermissionState',
      );
      requestSpy = jest.spyOn(
        homeDataAccessService,
        'requestLocationPermission',
      );
      settingsSpy = jest.spyOn(homeDataAccessService, 'openLocationSettings');
      reloadSpy = jest.spyOn(homeDataAccessService, 'reloadGPSPosition');
      clearErrorSpy = jest.spyOn(homeDataAccessService, 'clearGpsError');
    });

    it('asks for permission when the OS prompt is still unspent', inject(
      [HomeService],
      async (service: HomeService) => {
        stateSpy.mockResolvedValue('prompt');
        requestSpy.mockResolvedValue('granted');

        await service.enableLocation();

        expect(requestSpy).toHaveBeenCalledTimes(1);
        expect(settingsSpy).not.toHaveBeenCalled();
        expect(reloadSpy).toHaveBeenCalledTimes(1);
      },
    ));

    it('does not reload when the user declines the prompt', inject(
      [HomeService],
      async (service: HomeService) => {
        stateSpy.mockResolvedValue('prompt');
        requestSpy.mockResolvedValue('denied');

        await service.enableLocation();

        expect(reloadSpy).not.toHaveBeenCalled();
      },
    ));

    it('opens system settings when location was already denied', inject(
      [HomeService],
      async (service: HomeService) => {
        // The OS ignores further requests once denied, so asking again would
        // silently do nothing — settings is the only route back.
        stateSpy.mockResolvedValue('denied');

        await service.enableLocation();

        expect(settingsSpy).toHaveBeenCalledTimes(1);
        expect(requestSpy).not.toHaveBeenCalled();
        expect(reloadSpy).not.toHaveBeenCalled();
      },
    ));

    it('clears a stale error and re-reads when permission is already granted', inject(
      [HomeService],
      async (service: HomeService) => {
        stateSpy.mockResolvedValue('granted');

        await service.enableLocation();

        expect(requestSpy).not.toHaveBeenCalled();
        expect(clearErrorSpy).toHaveBeenCalledTimes(1);
        expect(reloadSpy).toHaveBeenCalledTimes(1);
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

  describe('email verification', () => {
    it('should expose the shared prompt-visible signal', inject(
      [HomeService],
      (service: HomeService) => {
        expect(service.emailVerificationPromptVisible).toBe(
          emailVerificationMock.promptVisible,
        );
      },
    ));

    it('should expose the shared resend-running signal', inject(
      [HomeService],
      (service: HomeService) => {
        expect(service.emailVerificationResendRunning).toBe(
          emailVerificationMock.resendRunning,
        );
      },
    ));

    it('should delegate prompt tracking to the email verification service', inject(
      [HomeService],
      (service: HomeService) => {
        service.trackEmailVerificationPromptShown('home');

        expect(emailVerificationMock.trackPromptShown).toHaveBeenCalledWith(
          'home',
        );
      },
    ));

    it('should delegate resend to the email verification service', inject(
      [HomeService],
      async (service: HomeService) => {
        await service.resendEmailVerification('home');

        expect(emailVerificationMock.resend).toHaveBeenCalledWith('home');
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

  describe('retryBiteImageUpload', () => {
    const failedBite = { id: 'bite1', name: 'Pizza' } as Bite;

    it('should re-send the local copy without asking when the bite still has one', inject(
      [HomeService],
      async (service: HomeService) => {
        biteDataAccessMock.findLocalImageForBite.mockResolvedValue({
          uri: 'file:///bites_bite1.jpg',
          name: 'bites_bite1.jpg',
        });

        await service.retryBiteImageUpload(failedBite);

        expect(localImagePickerMock.pick).not.toHaveBeenCalled();
        expect(biteDataAccessMock.retryImageUpload).toHaveBeenCalledWith(
          failedBite,
          'file:///bites_bite1.jpg',
        );
      },
    ));

    it('should ask the user to pick a photo when the local copy is gone', inject(
      [HomeService],
      async (service: HomeService) => {
        biteDataAccessMock.findLocalImageForBite.mockResolvedValue(undefined);
        localImagePickerMock.pick.mockResolvedValue({
          uri: 'file:///picked.jpg',
          name: 'picked.jpg',
          src: 'picked',
        });

        await service.retryBiteImageUpload(failedBite);

        expect(biteDataAccessMock.retryImageUpload).toHaveBeenCalledWith(
          failedBite,
          'file:///picked.jpg',
        );
      },
    ));

    it('should upload nothing when the user backs out of the picker', inject(
      [HomeService],
      async (service: HomeService) => {
        biteDataAccessMock.findLocalImageForBite.mockResolvedValue(undefined);
        localImagePickerMock.pick.mockResolvedValue(undefined);

        await service.retryBiteImageUpload(failedBite);

        expect(biteDataAccessMock.retryImageUpload).not.toHaveBeenCalled();
      },
    ));
  });
});

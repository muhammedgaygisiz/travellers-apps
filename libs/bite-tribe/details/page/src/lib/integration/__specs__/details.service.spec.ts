import { TestBed } from '@angular/core/testing';
import { DetailsService } from '../details.service';
import {
  DetailsDataAccessService,
  SaveImageDeniedError,
  ShareImageUnavailableError,
  ShareTargetUnavailableError,
} from 'bite-tribe/details-data-access';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { signal } from '@angular/core';
import {
  Bite,
  Bucketlist,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
} from 'model';
import {
  ActionSheetController,
  ModalController,
  NavController,
} from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { ShareImageComposerComponent } from 'bite-tribe/share-image-ui';
import { ToastService } from 'toast';
import { Capacitor } from '@capacitor/core';
import { AnalyticsService } from 'ta-firestore';
import SpyInstance = jest.SpyInstance;

type MockDetailsDataAccessService = Omit<
  Partial<DetailsDataAccessService>,
  'bite'
> & {
  bite?: {
    value: ReturnType<typeof signal<Bite | undefined>>;
    reload?: jest.Mock;
  };
};

const mockBite: Bite = {
  id: 'bite123',
  name: 'Test Bite',
} as Bite;

const createMockDataAccess = (
  overrides: MockDetailsDataAccessService = {},
): MockDetailsDataAccessService => {
  const base = {
    bite: {
      value: signal(mockBite),
      reload: jest.fn(),
    },
    biteValue: signal(mockBite),
    biteCreatorValue: signal(undefined),
    reviewThreads: signal([]),
    highlightedThreadId: signal(undefined),
    bucketlists: signal([]),
    userId: signal('user1'),
    isAuthenticated: signal(true),
    saveNewTags: jest.fn(),
    saveNewReview: jest.fn(),
    saveReviewReply: jest.fn(),
    saveToBucketList: jest.fn(),
    createAndSaveToBucketList: jest.fn(),
    removeBiteFromBucketlist: jest.fn(),
    submitLikeClick: jest.fn(),
    currentPosition: jest.fn(),
    logout: jest.fn(),
    cacheBite: jest.fn(),
    shareBite: jest.fn(),
    canShareImageFiles: jest.fn().mockReturnValue(true),
    canShareImageTo: jest.fn().mockResolvedValue(true),
    shareBiteImageTo: jest.fn().mockResolvedValue(undefined),
    saveBiteImage: jest.fn().mockResolvedValue(undefined),
    reloadBite: jest.fn(),
    reportBite: jest.fn().mockResolvedValue({ reported: true }),
    ownBites: jest.fn().mockResolvedValue([]),
  };
  return { ...base, ...overrides } as MockDetailsDataAccessService;
};

const createNavControllerMock = (): Partial<NavController> => ({
  navigateForward: jest.fn().mockResolvedValue(true),
});

const mockBiteDataAccessService = {
  findLocalImageForBite: jest.fn().mockResolvedValue(undefined),
  retryImageUpload: jest.fn().mockResolvedValue(undefined),
};

const mockLocalImagePicker = {
  pick: jest.fn().mockResolvedValue(undefined),
};

const mockToast = {
  present: jest.fn().mockResolvedValue(undefined),
};

/** The share menu, answering with whichever entry a test picks. */
const createShareMenu = (
  choice?: string,
): { present: jest.Mock; onDidDismiss: jest.Mock } => ({
  present: jest.fn().mockResolvedValue(undefined),
  onDidDismiss: jest.fn().mockResolvedValue({ data: choice }),
});

const mockActionSheetController = {
  create: jest.fn(),
};

const mockModal = {
  present: jest.fn().mockResolvedValue(undefined),
  dismiss: jest.fn().mockResolvedValue(true),
};

const mockModalController = {
  create: jest.fn().mockResolvedValue(mockModal),
};

const mockTransloco = {
  translate: jest.fn((key: string) => key),
};

const mockAnalytics = {
  logEvent: jest.fn(),
};

const shareProviders = [
  { provide: AnalyticsService, useValue: mockAnalytics },
  { provide: ActionSheetController, useValue: mockActionSheetController },
  { provide: ModalController, useValue: mockModalController },
  { provide: TranslocoService, useValue: mockTransloco },
];

describe('DetailsService', () => {
  let service: DetailsService;
  let mockDataAccessService: MockDetailsDataAccessService;
  let mockNavController: Partial<NavController>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockDataAccessService = createMockDataAccess();
    mockNavController = createNavControllerMock();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: BiteDataAccessService,
          useValue: mockBiteDataAccessService,
        },
        {
          provide: LocalImagePickerService,
          useValue: mockLocalImagePicker,
        },
        DetailsService,
        { provide: ToastService, useValue: mockToast },
        {
          provide: DetailsDataAccessService,
          useValue: mockDataAccessService,
        },
        {
          provide: NavController,
          useValue: mockNavController,
        },
        ...shareProviders,
      ],
    });

    service = TestBed.inject(DetailsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have bite data from DetailsDataAccessService', () => {
    expect(service.bite.value()).toEqual(mockBite);
  });

  it('should run the read again on request, without leaving the page', () => {
    service.retryBiteLoad();

    expect(mockDataAccessService.reloadBite).toHaveBeenCalled();
  });

  it('should call dataAccess.saveNewReview with provided review data', () => {
    // Arrange
    const reviewData = {
      review: 'Great food!',
      biteId: 'bite123',
    };

    // Act
    service.saveReview(reviewData);

    // Assert
    expect(mockDataAccessService.saveNewReview).toHaveBeenCalledWith(
      reviewData,
    );
    expect(mockDataAccessService.saveNewReview).toHaveBeenCalledTimes(1);
  });

  it('should call dataAccess.saveReviewReply with the answered thread', () => {
    // Arrange
    const reply = {
      review: 'Thanks!',
      biteId: 'bite123',
      parentReviewId: 'root-1',
      threadId: 'root-1',
    };

    // Act
    service.saveReviewReply(reply);

    // Assert
    expect(mockDataAccessService.saveReviewReply).toHaveBeenCalledWith(reply);
    expect(mockDataAccessService.saveReviewReply).toHaveBeenCalledTimes(1);
  });

  describe('addBiteToSelectedBucketList', () => {
    const mockBucketlist: Bucketlist = {
      id: 'list123',
      name: 'My List',
    } as Bucketlist;

    beforeEach(() => {
      // Reset mocks between tests
      jest.clearAllMocks();
      TestBed.resetTestingModule();
    });

    it('should call dataAccess.saveToBucketList with correct parameters when bite exists', () => {
      // Arrange
      mockDataAccessService = {
        biteValue: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
        saveToBucketList: jest.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          {
            provide: BiteDataAccessService,
            useValue: mockBiteDataAccessService,
          },
          {
            provide: LocalImagePickerService,
            useValue: mockLocalImagePicker,
          },
          DetailsService,
          { provide: ToastService, useValue: mockToast },
          ...shareProviders,
          {
            provide: DetailsDataAccessService,
            useValue: mockDataAccessService,
          },
        ],
      });
      service = TestBed.inject(DetailsService);

      // Act
      service.addBiteToSelectedBucketList(mockBucketlist);

      // Assert
      expect(mockDataAccessService.saveToBucketList).toHaveBeenCalledWith({
        bucketListId: 'list123',
        biteId: 'bite123',
      });
      expect(mockDataAccessService.saveToBucketList).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined bite gracefully', () => {
      // Arrange
      mockDataAccessService = {
        biteValue: signal(undefined),
        saveToBucketList: jest.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          {
            provide: BiteDataAccessService,
            useValue: mockBiteDataAccessService,
          },
          {
            provide: LocalImagePickerService,
            useValue: mockLocalImagePicker,
          },
          DetailsService,
          { provide: ToastService, useValue: mockToast },
          ...shareProviders,
          {
            provide: DetailsDataAccessService,
            useValue: mockDataAccessService,
          },
        ],
      });
      service = TestBed.inject(DetailsService);

      // Act
      service.addBiteToSelectedBucketList(mockBucketlist);

      // Assert
      expect(mockDataAccessService.saveToBucketList).toHaveBeenCalledWith({
        bucketListId: 'list123',
        biteId: undefined,
      });
      expect(mockDataAccessService.saveToBucketList).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveBiteToBucketListWithNewList', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      TestBed.resetTestingModule();
    });

    it('should call dataAccess.createAndSaveToBucketList with correct parameters when bite exists', () => {
      // Arrange
      mockDataAccessService = {
        biteValue: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
        createAndSaveToBucketList: jest.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          {
            provide: BiteDataAccessService,
            useValue: mockBiteDataAccessService,
          },
          {
            provide: LocalImagePickerService,
            useValue: mockLocalImagePicker,
          },
          DetailsService,
          { provide: ToastService, useValue: mockToast },
          ...shareProviders,
          {
            provide: DetailsDataAccessService,
            useValue: mockDataAccessService,
          },
        ],
      });
      service = TestBed.inject(DetailsService);

      // Act
      service.saveBiteToBucketListWithNewList('My New List');

      // Assert
      expect(
        mockDataAccessService.createAndSaveToBucketList,
      ).toHaveBeenCalledWith({
        bucketListName: 'My New List',
        biteId: 'bite123',
      });
      expect(
        mockDataAccessService.createAndSaveToBucketList,
      ).toHaveBeenCalledTimes(1);
    });

    it('should not create a list when the bite is not loaded yet', () => {
      // Arrange
      mockDataAccessService = {
        biteValue: signal(undefined),
        createAndSaveToBucketList: jest.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          {
            provide: BiteDataAccessService,
            useValue: mockBiteDataAccessService,
          },
          {
            provide: LocalImagePickerService,
            useValue: mockLocalImagePicker,
          },
          DetailsService,
          { provide: ToastService, useValue: mockToast },
          ...shareProviders,
          {
            provide: DetailsDataAccessService,
            useValue: mockDataAccessService,
          },
        ],
      });
      service = TestBed.inject(DetailsService);

      // Act
      service.saveBiteToBucketListWithNewList('My New List');

      // Assert
      expect(
        mockDataAccessService.createAndSaveToBucketList,
      ).not.toHaveBeenCalled();
    });
  });

  describe('removeBiteFromBucketlist', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      TestBed.resetTestingModule();
    });

    it('should call dataAccess.removeBiteFromBucketlist with correct parameters', () => {
      // Arrange
      mockDataAccessService = {
        removeBiteFromBucketlist: jest.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          {
            provide: BiteDataAccessService,
            useValue: mockBiteDataAccessService,
          },
          {
            provide: LocalImagePickerService,
            useValue: mockLocalImagePicker,
          },
          DetailsService,
          { provide: ToastService, useValue: mockToast },
          ...shareProviders,
          {
            provide: DetailsDataAccessService,
            useValue: mockDataAccessService,
          },
        ],
      });
      service = TestBed.inject(DetailsService);

      const params: RemoveBiteFromBucketlistParams = {
        bucketlistId: 'list123',
        biteId: 'bite123',
      };

      // Act
      service.removeBiteFromBucketlist(params);

      // Assert
      expect(
        mockDataAccessService.removeBiteFromBucketlist,
      ).toHaveBeenCalledWith(params);
      expect(
        mockDataAccessService.removeBiteFromBucketlist,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('likeButtonClicked', () => {
    it('should call dataAccess.submitLikeClick with correct parameters', () => {
      const likeClick: LikeClick = {
        likeType: 'thumbup',
        biteId: 'bite123',
        action: 'save',
      };
      service.likeButtonClicked(likeClick);

      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledWith(
        likeClick,
      );
      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger reload of bite after 1 sec', () => {
      jest.useFakeTimers();
      const likeClick: LikeClick = {
        likeType: 'thumbup',
        biteId: 'bite123',
        action: 'save',
      };
      service.likeButtonClicked(likeClick);

      // Fast-forward time
      jest.runAllTimers();

      expect(service.bite.reload).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call dataAccess.logout', () => {
      service.logout();
      expect(mockDataAccessService.logout).toHaveBeenCalled();
      expect(mockDataAccessService.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('onRestaurantClick', () => {
    it('should navigate to restaurant page with restaurantId if available', () => {
      const bite: Bite = {
        id: 'bite123',
        name: 'Test Bite',
        restaurantId: 'resto123',
      } as Bite;

      service.onRestaurantClick(bite);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite123',
        'restaurant',
        'resto123',
      ]);
    });

    it('should navigate to restaurant page with encoded place name from bite', () => {
      const bite: Bite = {
        id: 'bite123',
        name: 'Test Bite',
        place: 'Some Place',
      } as Bite;

      service.onRestaurantClick(bite);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite123',
        'restaurant',
        'place',
        encodeURIComponent('Some Place'),
      ]);
    });
  });

  describe('onGoToProfileClick', () => {
    it('should navigate to user profile page with userId', () => {
      const publicUser = { userId: 'user123' } as PublicUser;
      service.onGoToProfileClick(publicUser);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'profile',
        'user123',
      ]);
    });
  });

  describe('onGotoEditClick', () => {
    it('should navigate to bite edit page with bite id', () => {
      const biteToEdit: Bite = { id: 'bite123' } as Bite;
      service.onGotoEditClick(biteToEdit);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite123',
        'edit',
      ]);
    });
  });

  describe('onGotoNewClick', () => {
    let cacheBiteSpy: SpyInstance;

    beforeEach(() => {
      cacheBiteSpy = jest
        .spyOn(service.dataAccess, 'cacheBite')
        .mockImplementation();
    });

    it('should navigate to new bite page with user agnostic bite info', () => {
      const originalBite: Bite = {
        id: 'bite123',
        name: 'Pizzoccheri',
        place: 'Grotto Broggini',
        price: 25,
        currency: 'CHF',
        restaurantId: '123',
        position: { latitude: 0, longitude: 0 },
      } as Bite;
      service.onGotoNewClick(originalBite);
      expect(cacheBiteSpy).toHaveBeenCalledTimes(1);
      expect(cacheBiteSpy).toHaveBeenCalledWith({
        ...originalBite,
        id: undefined,
      });
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'new-bite',
      ]);
    });
  });

  /** The share button (UC-SBS R-1 to R-3, issue #1726). */
  describe('onShareBiteClick', () => {
    const othersBite = {
      id: 'bite123',
      name: 'Test Bite',
      userId: 'someone-else',
    } as Bite;
    const ownBite = { ...othersBite, userId: 'user1' } as Bite;

    let isNative: jest.SpyInstance;

    beforeEach(() => {
      mockActionSheetController.create.mockReset();
      mockModalController.create.mockClear();
      mockModal.dismiss.mockClear();
      mockToast.present.mockClear();
      // A device, unless a test says it runs in a browser.
      isNative = jest
        .spyOn(Capacitor, 'isNativePlatform')
        .mockReturnValue(true);
    });

    afterEach(() => isNative.mockRestore());

    it("runs the link share directly on somebody else's Bite", async () => {
      await service.onShareBiteClick(othersBite);

      expect(service.dataAccess.shareBite).toHaveBeenCalledWith(othersBite);
      expect(service.dataAccess.shareBite).toHaveBeenCalledTimes(1);
      expect(mockActionSheetController.create).not.toHaveBeenCalled();
    });

    it("offers the share menu on the viewer's own Bite", async () => {
      mockActionSheetController.create.mockResolvedValue(createShareMenu());

      await service.onShareBiteClick(ownBite);

      const { buttons } = mockActionSheetController.create.mock.calls[0][0];
      expect(buttons.map((button: { data?: string }) => button.data)).toEqual([
        'instagram-story',
        'instagram-post',
        'facebook-story',
        'more',
        undefined,
      ]);
      expect(service.dataAccess.shareBite).not.toHaveBeenCalled();
    });

    it('runs the unchanged link share for More…', async () => {
      mockActionSheetController.create.mockResolvedValue(
        createShareMenu('more'),
      );

      await service.onShareBiteClick(ownBite);

      expect(service.dataAccess.shareBite).toHaveBeenCalledWith(ownBite);
      expect(mockModalController.create).not.toHaveBeenCalled();
    });

    it.each([
      ['instagram-story', 'story'],
      ['instagram-post', 'post'],
      ['facebook-story', 'story'],
    ])(
      'opens the image composer for %s in the %s format',
      async (choice, format) => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu(choice),
        );

        await service.onShareBiteClick(ownBite);

        const { component, componentProps } =
          mockModalController.create.mock.calls[0][0];
        expect(component).toBe(ShareImageComposerComponent);
        expect(mockModalController.create.mock.calls[0][0].cssClass).toBe(
          'share-image-composer-modal',
        );
        expect(componentProps.bite()).toBe(ownBite);
        expect(componentProps.format()).toBe(format);
        expect(mockModal.present).toHaveBeenCalled();
      },
    );

    it('does nothing when the menu is cancelled', async () => {
      mockActionSheetController.create.mockResolvedValue(createShareMenu());

      await service.onShareBiteClick(ownBite);

      expect(service.dataAccess.shareBite).not.toHaveBeenCalled();
      expect(mockModalController.create).not.toHaveBeenCalled();
    });

    /** Share image… in a browser; a device reaches the sheet as a fallback. */
    describe('sharing the composed image through the share sheet', () => {
      const image = new Blob(['jpeg'], { type: 'image/jpeg' });

      beforeEach(() => isNative.mockReturnValue(false));

      const openComposer = async (): Promise<(blob: Blob) => Promise<void>> => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('share-image'),
        );
        await service.onShareBiteClick(ownBite);

        return mockModalController.create.mock.calls[0][0].componentProps.shareImage();
      };

      it('hands the image to the data access', async () => {
        mockDataAccessService.shareBiteImage = jest
          .fn()
          .mockResolvedValue(undefined);

        await (
          await openComposer()
        )(image);

        expect(mockDataAccessService.shareBiteImage).toHaveBeenCalledWith(
          ownBite,
          image,
        );
        expect(mockToast.present).not.toHaveBeenCalled();
      });

      it('says nothing when the user closes the share sheet', async () => {
        mockDataAccessService.shareBiteImage = jest
          .fn()
          .mockRejectedValue(new Error('Share canceled'));

        await (
          await openComposer()
        )(image);

        expect(mockToast.present).not.toHaveBeenCalled();
      });

      it('says when this browser cannot share an image', async () => {
        mockDataAccessService.shareBiteImage = jest
          .fn()
          .mockRejectedValue(new ShareImageUnavailableError());

        await (
          await openComposer()
        )(image);

        expect(mockToast.present).toHaveBeenCalledWith({
          messageKey: 'share-image-unavailable',
          outcome: 'failure',
        });
      });

      it('reports any other failure', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockDataAccessService.shareBiteImage = jest
          .fn()
          .mockRejectedValue(new Error('disk full'));

        await (
          await openComposer()
        )(image);

        expect(mockToast.present).toHaveBeenCalledWith({
          messageKey: 'share-image-failed',
          outcome: 'failure',
        });
      });
    });

    it.each([
      [{ public: true, displayName: 'Super Mario' }, 'Super Mario'],
      [{ public: false, displayName: 'Super Mario' }, undefined],
      [{ public: true, displayName: '' }, undefined],
      [undefined, undefined],
    ])(
      'passes the composer the sharer’s name only while their profile is public (%o)',
      async (creator, expected) => {
        mockDataAccessService.biteCreatorValue = signal(creator) as never;
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            {
              provide: BiteDataAccessService,
              useValue: mockBiteDataAccessService,
            },
            {
              provide: LocalImagePickerService,
              useValue: mockLocalImagePicker,
            },
            DetailsService,
            { provide: ToastService, useValue: mockToast },
            ...shareProviders,
            {
              provide: DetailsDataAccessService,
              useValue: mockDataAccessService,
            },
            { provide: NavController, useValue: mockNavController },
          ],
        });
        const sharing = TestBed.inject(DetailsService);
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('instagram-story'),
        );

        await sharing.onShareBiteClick(ownBite);

        const { componentProps } = mockModalController.create.mock.calls[0][0];
        expect(componentProps.creatorName()).toBe(expected);
      },
    );

    /** The menu offers an app only while it is installed (UC-SBS R-12). */
    it.each([
      [
        'Instagram is missing',
        {
          'instagram-story': false,
          'instagram-post': false,
          'facebook-story': true,
        },
        ['facebook-story', 'more'],
      ],
      [
        'Facebook is missing',
        {
          'instagram-story': true,
          'instagram-post': true,
          'facebook-story': false,
        },
        ['instagram-story', 'instagram-post', 'more'],
      ],
      [
        'neither is installed',
        {
          'instagram-story': false,
          'instagram-post': false,
          'facebook-story': false,
        },
        ['more'],
      ],
    ])(
      'leaves out the entries of an app that is not installed when %s',
      async (_, installed: Record<string, boolean>, expected) => {
        mockDataAccessService.canShareImageTo = jest.fn(
          async (target: string) => installed[target],
        );
        mockActionSheetController.create.mockResolvedValue(createShareMenu());

        await service.onShareBiteClick(ownBite);

        const { buttons } = mockActionSheetController.create.mock.calls[0][0];
        expect(
          buttons
            .map((button: { data?: string }) => button.data)
            .filter(Boolean),
        ).toEqual(expected);
      },
    );

    /** Each app entry opens its app directly on a device (issue #1730). */
    describe('handing the composed image to the app', () => {
      const image = new Blob(['jpeg'], { type: 'image/jpeg' });

      const openComposer = async (
        choice: string,
      ): Promise<(blob: Blob) => Promise<void>> => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu(choice),
        );
        await service.onShareBiteClick(ownBite);

        return mockModalController.create.mock.calls[0][0].componentProps.shareImage();
      };

      beforeEach(() => {
        mockDataAccessService.shareBiteImageTo = jest
          .fn()
          .mockResolvedValue(undefined);
        mockDataAccessService.shareBiteImage = jest
          .fn()
          .mockResolvedValue(undefined);
      });

      it.each(['instagram-story', 'instagram-post', 'facebook-story'])(
        'opens %s with the image, without the share sheet',
        async (choice) => {
          await (
            await openComposer(choice)
          )(image);

          expect(mockDataAccessService.shareBiteImageTo).toHaveBeenCalledWith(
            choice,
            ownBite,
            image,
          );
          expect(mockDataAccessService.shareBiteImage).not.toHaveBeenCalled();
          expect(mockToast.present).not.toHaveBeenCalled();
        },
      );

      it.each([
        ['the app is gone', new ShareTargetUnavailableError()],
        ['photo access was refused', new SaveImageDeniedError()],
        ['the hand-off failed', new Error('no activity')],
      ])(
        'falls back to the share sheet with the same image when %s',
        async (_, error) => {
          jest.spyOn(console, 'error').mockImplementation(() => undefined);
          mockDataAccessService.shareBiteImageTo = jest
            .fn()
            .mockRejectedValue(error);

          await (
            await openComposer('instagram-post')
          )(image);

          expect(mockDataAccessService.shareBiteImage).toHaveBeenCalledWith(
            ownBite,
            image,
          );
          expect(mockToast.present).not.toHaveBeenCalled();
        },
      );
    });

    /** A browser can open no app (UC-SBS R-1, R-12, issue #1732). */
    describe('in a browser', () => {
      beforeEach(() => isNative.mockReturnValue(false));

      const menuChoices = async (): Promise<(string | undefined)[]> => {
        mockActionSheetController.create.mockResolvedValue(createShareMenu());
        await service.onShareBiteClick(ownBite);

        return mockActionSheetController.create.mock.calls[0][0].buttons.map(
          (button: { data?: string }) => button.data,
        );
      };

      it('offers Save image, Share image… and More…, and no app', async () => {
        expect(await menuChoices()).toEqual([
          'save-image',
          'share-image',
          'more',
          undefined,
        ]);
      });

      it('leaves out Share image… where the browser cannot share files', async () => {
        mockDataAccessService.canShareImageFiles = jest
          .fn()
          .mockReturnValue(false);

        expect(await menuChoices()).toEqual(['save-image', 'more', undefined]);
      });

      it.each(['save-image', 'share-image'])(
        'opens the composer in Story format for %s',
        async (choice) => {
          mockActionSheetController.create.mockResolvedValue(
            createShareMenu(choice),
          );

          await service.onShareBiteClick(ownBite);

          const { componentProps } =
            mockModalController.create.mock.calls[0][0];
          expect(componentProps.format()).toBe('story');
        },
      );

      it('gives the composer no Share action where the browser cannot share files', async () => {
        mockDataAccessService.canShareImageFiles = jest
          .fn()
          .mockReturnValue(false);
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('save-image'),
        );

        await service.onShareBiteClick(ownBite);

        const { componentProps } = mockModalController.create.mock.calls[0][0];
        expect(componentProps.shareImage()).toBeUndefined();
        expect(componentProps.saveImage()).toEqual(expect.any(Function));
      });

      it('says the image was downloaded', async () => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('save-image'),
        );
        await service.onShareBiteClick(ownBite);

        await mockModalController.create.mock.calls[0][0].componentProps.saveImage()(
          new Blob(['jpeg']),
        );

        expect(mockToast.present).toHaveBeenCalledWith({
          messageKey: 'share-image-downloaded',
          outcome: 'success',
        });
      });
    });

    describe('saving the composed image on a device', () => {
      const image = new Blob(['jpeg'], { type: 'image/jpeg' });

      const save = async (): Promise<void> => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('instagram-story'),
        );
        await service.onShareBiteClick(ownBite);

        await mockModalController.create.mock.calls[0][0].componentProps.saveImage()(
          image,
        );
      };

      it('saves the image and says it is in Photos', async () => {
        await save();

        expect(mockDataAccessService.saveBiteImage).toHaveBeenCalledWith(
          ownBite,
          image,
        );
        expect(mockToast.present).toHaveBeenCalledWith({
          messageKey: 'share-image-saved',
          outcome: 'success',
        });
      });

      it('points to Settings when adding photos was refused', async () => {
        mockDataAccessService.saveBiteImage = jest
          .fn()
          .mockRejectedValue(new SaveImageDeniedError());

        await save();

        expect(mockToast.present).toHaveBeenCalledWith({
          messageKey: 'share-image-save-denied',
          outcome: 'failure',
        });
      });

      it('reports any other failure', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockDataAccessService.saveBiteImage = jest
          .fn()
          .mockRejectedValue(new Error('disk full'));

        await save();

        expect(mockToast.present).toHaveBeenCalledWith({
          messageKey: 'share-image-save-failed',
          outcome: 'failure',
        });
      });
    });

    /** The share funnel's analytics (UC-SBS R-24, R-29, issue #1733). */
    describe('analytics', () => {
      const image = new Blob(['jpeg'], { type: 'image/jpeg' });

      /** Every event logged, as `[name, params]`. */
      const logged = (): [string, Record<string, unknown>?][] =>
        mockAnalytics.logEvent.mock.calls as [
          string,
          Record<string, unknown>?,
        ][];

      const names = (): string[] => logged().map(([name]) => name);

      const componentProps = (): Record<string, () => unknown> & {
        layoutChosen: { emit: (layout: string) => void };
      } => mockModalController.create.mock.calls[0][0].componentProps;

      const openComposer = async (
        choice = 'instagram-story',
      ): Promise<void> => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu(choice),
        );
        await service.onShareBiteClick(ownBite);
      };

      beforeEach(() => mockAnalytics.logEvent.mockClear());

      it('counts the menu once it is shown, and nothing more when it is dismissed', async () => {
        mockActionSheetController.create.mockResolvedValue(createShareMenu());

        await service.onShareBiteClick(ownBite);

        expect(logged()).toEqual([
          ['share_menu_opened', { bite_id: 'bite123' }],
        ]);
      });

      it("counts nothing for the link share on somebody else's Bite", async () => {
        await service.onShareBiteClick(othersBite);

        expect(mockAnalytics.logEvent).not.toHaveBeenCalled();
      });

      it.each([
        ['instagram-story', 'instagram_story'],
        ['instagram-post', 'instagram_post'],
        ['facebook-story', 'facebook_story'],
        ['more', 'more'],
      ])('names the %s entry %s', async (choice, target) => {
        await openComposer(choice);

        expect(logged()[1]).toEqual([
          'share_target_chosen',
          { bite_id: 'bite123', target },
        ]);
      });

      it('names the browser entries save and share_image', async () => {
        isNative.mockReturnValue(false);

        await openComposer('save-image');
        await openComposer('share-image');

        const targets = logged()
          .filter(([name]) => name === 'share_target_chosen')
          .map(([, params]) => params?.['target']);
        expect(targets).toEqual(['save', 'share_image']);
      });

      it('counts the composer once it is shown, with its format', async () => {
        await openComposer('instagram-post');

        expect(names()).toEqual([
          'share_menu_opened',
          'share_target_chosen',
          'share_composer_opened',
        ]);
        expect(logged()[2][1]).toEqual({
          bite_id: 'bite123',
          target: 'instagram_post',
          format: 'post',
        });
      });

      it('counts each layout the user picks, and hands off the last one', async () => {
        await openComposer();

        componentProps().layoutChosen.emit('wide');
        await (
          componentProps()['saveImage']() as (blob: Blob) => Promise<void>
        )(image);

        const funnel = {
          bite_id: 'bite123',
          target: 'instagram_story',
          format: 'story',
          template: 'wide',
        };
        expect(logged().slice(3)).toEqual([
          ['share_template_chosen', funnel],
          ['share_handoff_succeeded', { ...funnel, action: 'save' }],
        ]);
      });

      /** A celebrated Bite (issue #1837). */
      describe('celebration', () => {
        const datedOwnBite = {
          ...ownBite,
          createdAtTimestamp: 2,
          countryCode: 'TH',
        } as Bite;
        const earlier = {
          id: 'earlier',
          userId: 'user1',
          createdAtTimestamp: 1,
          countryCode: 'DE',
        } as Bite;

        /** Lets the read of the sharer's own Bites settle; timers are fake. */
        const settle = async (): Promise<void> => {
          for (let tick = 0; tick < 5; tick += 1) {
            await Promise.resolve();
          }
        };

        const openCelebrated = async (): Promise<void> => {
          (service.dataAccess.ownBites as jest.Mock).mockResolvedValue([
            earlier,
            datedOwnBite,
          ]);
          mockActionSheetController.create.mockResolvedValue(
            createShareMenu('instagram-story'),
          );
          await service.onShareBiteClick(datedOwnBite);
          await settle();
        };

        const handOff = async (): Promise<Record<string, unknown>> => {
          await (
            componentProps()['saveImage']() as (blob: Blob) => Promise<void>
          )(image);

          return logged().at(-1)?.[1] as Record<string, unknown>;
        };

        it('hands the composer the first the Bite was', async () => {
          await openCelebrated();

          expect(componentProps()['celebration']()).toEqual({
            moment: 'first-country',
            countryCode: 'TH',
          });
        });

        it('offers no celebration where the own Bites cannot be read', async () => {
          (service.dataAccess.ownBites as jest.Mock).mockRejectedValue(
            new Error('offline'),
          );
          jest.spyOn(console, 'error').mockImplementation(() => undefined);

          await openComposer();
          await settle();

          expect(componentProps()['celebration']()).toBeUndefined();
        });

        it('names the moment on the hand-off while the line is on', async () => {
          await openCelebrated();

          expect((await handOff())['celebration']).toBe('first_country');
        });

        it('leaves the moment out once the line is switched off', async () => {
          await openCelebrated();

          (
            componentProps() as unknown as {
              celebrationSwitched: { emit: (on: boolean) => void };
            }
          ).celebrationSwitched.emit(false);

          expect(await handOff()).not.toHaveProperty('celebration');
        });
      });

      it('hands off the layout the composer opened on when none was picked', async () => {
        await openComposer();

        await (
          componentProps()['shareImage']() as (blob: Blob) => Promise<void>
        )(image);

        expect(logged()[3]).toEqual([
          'share_handoff_succeeded',
          {
            bite_id: 'bite123',
            target: 'instagram_story',
            format: 'story',
            template: 'classic',
            action: 'open_app',
          },
        ]);
      });

      it.each([
        ['permission_denied', new SaveImageDeniedError()],
        ['unavailable', new ShareTargetUnavailableError()],
        ['failed', new Error('no activity')],
      ])(
        'counts a direct hand-off that failed as %s, then the share sheet it fell back to',
        async (reason, error) => {
          jest.spyOn(console, 'error').mockImplementation(() => undefined);
          mockDataAccessService.shareBiteImageTo = jest
            .fn()
            .mockRejectedValue(error);
          mockDataAccessService.shareBiteImage = jest
            .fn()
            .mockResolvedValue(undefined);
          await openComposer();

          await (
            componentProps()['shareImage']() as (blob: Blob) => Promise<void>
          )(image);

          expect(logged().slice(3)).toEqual([
            [
              'share_handoff_failed',
              expect.objectContaining({ action: 'open_app', reason }),
            ],
            [
              'share_handoff_succeeded',
              expect.objectContaining({ action: 'share' }),
            ],
          ]);
        },
      );

      it.each([
        ['cancelled', new Error('Share canceled')],
        ['unavailable', new ShareImageUnavailableError()],
        ['failed', new Error('disk full')],
      ])('counts a share that did not leave as %s', async (reason, error) => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        isNative.mockReturnValue(false);
        mockDataAccessService.shareBiteImage = jest
          .fn()
          .mockRejectedValue(error);
        await openComposer('share-image');

        await (
          componentProps()['shareImage']() as (blob: Blob) => Promise<void>
        )(image);

        expect(logged()[3]).toEqual([
          'share_handoff_failed',
          expect.objectContaining({ action: 'share', reason }),
        ]);
        expect(names()).not.toContain('share_handoff_succeeded');
      });

      it.each([
        ['permission_denied', new SaveImageDeniedError()],
        ['failed', new Error('disk full')],
      ])('counts a save that did not happen as %s', async (reason, error) => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockDataAccessService.saveBiteImage = jest
          .fn()
          .mockRejectedValue(error);
        await openComposer();

        await (
          componentProps()['saveImage']() as (blob: Blob) => Promise<void>
        )(image);

        expect(logged()[3]).toEqual([
          'share_handoff_failed',
          expect.objectContaining({ action: 'save', reason }),
        ]);
      });

      /** R-24: identifiers and enums only. */
      it('carries no dish name, place or display name in any parameter', async () => {
        const named = {
          ...ownBite,
          name: 'Pad thai',
          place: 'Som Tam Nua',
          city: 'Bangkok',
        } as Bite;
        mockDataAccessService.biteCreatorValue = signal({
          public: true,
          displayName: 'Super Mario',
        }) as never;
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('instagram-story'),
        );

        await service.onShareBiteClick(named);
        componentProps().layoutChosen.emit('wide');
        await (
          componentProps()['saveImage']() as (blob: Blob) => Promise<void>
        )(image);

        const values = logged().flatMap(([, params]) =>
          Object.values(params ?? {}),
        );
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) {
          expect([
            'Pad thai',
            'Som Tam Nua',
            'Bangkok',
            'Super Mario',
          ]).not.toContain(value);
        }
        const keys = new Set(
          logged().flatMap(([, params]) => Object.keys(params ?? {})),
        );
        expect([...keys].sort()).toEqual(
          ['action', 'bite_id', 'format', 'target', 'template'].sort(),
        );
      });
    });

    it('closes the composer when it asks to', async () => {
      mockActionSheetController.create.mockResolvedValue(
        createShareMenu('instagram-story'),
      );

      await service.onShareBiteClick(ownBite);
      mockModalController.create.mock.calls[0][0].componentProps.closed.emit();

      expect(mockModal.dismiss).toHaveBeenCalled();
    });
  });

  /** Reporting a Bite to the operators (issue #1608). */
  describe('reportBite', () => {
    beforeEach(() => mockToast.present.mockClear());

    it('files the report and says it was received', async () => {
      await service.reportBite({ biteId: 'bite123', reason: 'spam' });

      expect(service.dataAccess.reportBite).toHaveBeenCalledWith(
        'bite123',
        'spam',
      );
      expect(mockToast.present).toHaveBeenCalledWith({
        messageKey: 'report-bite-sent',
        outcome: 'success',
      });
    });

    it('says so when the account had already reported the Bite', async () => {
      jest
        .mocked(service.dataAccess.reportBite)
        .mockResolvedValueOnce({ reported: false });

      await service.reportBite({ biteId: 'bite123', reason: 'spam' });

      expect(mockToast.present).toHaveBeenCalledWith({
        messageKey: 'report-bite-already-sent',
        outcome: 'success',
      });
    });

    it('says the report failed rather than pretending it went through', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      jest
        .mocked(service.dataAccess.reportBite)
        .mockRejectedValueOnce(new Error('unavailable'));

      await service.reportBite({ biteId: 'bite123', reason: 'spam' });

      expect(mockToast.present).toHaveBeenCalledWith({
        messageKey: 'report-bite-failed',
        outcome: 'failure',
      });
    });
  });
});

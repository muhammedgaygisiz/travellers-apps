import { TestBed } from '@angular/core/testing';
import { DetailsService } from '../details.service';
import {
  DetailsDataAccessService,
  SaveImageDeniedError,
  ShareImageUnavailableError,
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
    saveBiteImage: jest.fn().mockResolvedValue(undefined),
    reloadBite: jest.fn(),
    reportBite: jest.fn().mockResolvedValue({ reported: true }),
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

const shareProviders = [
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

    describe('sharing the composed image', () => {
      const image = new Blob(['jpeg'], { type: 'image/jpeg' });

      const openComposer = async (): Promise<(blob: Blob) => Promise<void>> => {
        mockActionSheetController.create.mockResolvedValue(
          createShareMenu('instagram-story'),
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

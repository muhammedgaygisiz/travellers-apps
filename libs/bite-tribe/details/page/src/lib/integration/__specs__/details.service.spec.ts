import { TestBed } from '@angular/core/testing';
import { DetailsService } from '../details.service';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import { signal } from '@angular/core';
import { Bite, Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
import { NavController } from '@ionic/angular/standalone';
import SpyInstance = jest.SpyInstance;

const mockBite: Bite = {
  id: 'bite123',
  name: 'Test Bite',
} as Bite;

const createMockDataAccess = (overrides = {}): any => {
  const base = {
    bite: {
      value: signal(mockBite),
      reload: jest.fn(),
    },
    reviews: signal([]),
    bucketlists: signal([]),
    userId: signal('user1'),
    isAuthenticated: signal(true),
    saveNewTags: jest.fn(),
    saveNewReview: jest.fn(),
    saveToBucketList: jest.fn(),
    createAndSaveToBucketList: jest.fn(),
    removeBiteFromBucketlist: jest.fn(),
    submitLikeClick: jest.fn(),
    currentPosition: jest.fn(),
    logout: jest.fn(),
    cacheBite: jest.fn(),
    shareBite: jest.fn(),
  };
  return { ...base, ...overrides };
};

const createNavControllerMock = (): any => ({
  navigateForward: jest.fn().mockResolvedValue(true),
  navigateBack: jest.fn().mockResolvedValue(true),
  navigateRoot: jest.fn().mockResolvedValue(true),
  back: jest.fn(),
  pop: jest.fn().mockResolvedValue(true),
  getRouteId: jest.fn(),
  isTransitioning: jest.fn(),
  consumeTransition: jest.fn(),
  setDirection: jest.fn(),
  setTopOutlet: jest.fn(),
});

describe('DetailsService', () => {
  let service: DetailsService;
  let mockDataAccessService: Partial<DetailsDataAccessService>;
  let mockNavController: Partial<NavController>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockDataAccessService = createMockDataAccess();
    mockNavController = createNavControllerMock();

    TestBed.configureTestingModule({
      providers: [
        DetailsService,
        {
          provide: DetailsDataAccessService,
          useValue: mockDataAccessService,
        },
        {
          provide: NavController,
          useValue: mockNavController,
        },
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
        bite: {
          value: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
        },
        saveToBucketList: jest.fn(),
      } as any;

      TestBed.configureTestingModule({
        providers: [
          DetailsService,
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
        bite: {
          value: signal(undefined),
        },
        saveToBucketList: jest.fn(),
      } as any;

      TestBed.configureTestingModule({
        providers: [
          DetailsService,
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
        bite: {
          value: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
        },
        createAndSaveToBucketList: jest.fn(),
      } as any;

      TestBed.configureTestingModule({
        providers: [
          DetailsService,
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

    it('should handle undefined bite gracefully', () => {
      // Arrange
      mockDataAccessService = {
        bite: {
          value: signal(undefined),
        },
        createAndSaveToBucketList: jest.fn(),
      } as any;

      TestBed.configureTestingModule({
        providers: [
          DetailsService,
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
        biteId: undefined,
      });
      expect(
        mockDataAccessService.createAndSaveToBucketList,
      ).toHaveBeenCalledTimes(1);
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
      } as any;

      TestBed.configureTestingModule({
        providers: [
          DetailsService,
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
      const likeClick = { likeType: 'like', biteId: 'bite123' } as any;
      service.likeButtonClicked(likeClick);

      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledWith(
        likeClick,
      );
      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger reload of bite after 1 sec', () => {
      jest.useFakeTimers();
      const likeClick = { likeType: 'like', biteId: 'bite123' } as any;
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
        restaurantId: '/restaurants/resto123',
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
      const publicUser = { userId: 'user123' } as any;
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
        position: {} as any,
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

  describe('onShareBiteClick', () => {
    it('should call dataAccess.shareBite with the provided bite', () => {
      const bite: Bite = { id: 'bite123', name: 'Test Bite' } as Bite;
      service.onShareBiteClick(bite);
      expect(service.dataAccess.shareBite).toHaveBeenCalledWith(bite);
      expect(service.dataAccess.shareBite).toHaveBeenCalledTimes(1);
    });
  });
});

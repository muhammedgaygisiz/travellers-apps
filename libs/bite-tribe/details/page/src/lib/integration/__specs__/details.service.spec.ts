import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetailsService } from '../details.service';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import { signal } from '@angular/core';
import { Bite, Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { vi } from 'vitest';

const mockBite: Bite = {
  id: 'bite123',
  name: 'Test Bite',
} as Bite;

const createMockDataAccess = (overrides = {}): any => {
  const base = {
    bite: signal(mockBite),
    reviews: signal([]),
    bucketlists: signal([]),
    userId: signal('user1'),
    isAuthenticated: signal(true),
    saveNewTags: vi.fn(),
    saveNewReview: vi.fn(),
    saveToBucketList: vi.fn(),
    createAndSaveToBucketList: vi.fn(),
    removeBiteFromBucketlist: vi.fn(),
    submitLikeClick: vi.fn(),
    currentPosition: vi.fn(),
    logout: vi.fn(),
  };
  return { ...base, ...overrides };
};

const createNavControllerMock = (): any => ({
  navigateForward: vi.fn().mockResolvedValue(true),
  navigateBack: vi.fn().mockResolvedValue(true),
  navigateRoot: vi.fn().mockResolvedValue(true),
  back: vi.fn(),
  pop: vi.fn().mockResolvedValue(true),
  getRouteId: vi.fn(),
  isTransitioning: vi.fn(),
  consumeTransition: vi.fn(),
  setDirection: vi.fn(),
  setTopOutlet: vi.fn(),
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
    expect(service.bite()).toEqual(mockBite);
  });

  it('should call dataAccess.saveNewTags with provided tags', () => {
    // Arrange
    const tags = ['italian', 'spicy'];

    // Act
    service.saveNewTags(tags);

    // Assert
    expect(mockDataAccessService.saveNewTags).toHaveBeenCalledWith(tags);
    expect(mockDataAccessService.saveNewTags).toHaveBeenCalledTimes(1);
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
      vi.clearAllMocks();
      TestBed.resetTestingModule();
    });

    it('should call dataAccess.saveToBucketList with correct parameters when bite exists', () => {
      // Arrange
      mockDataAccessService = {
        bite: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
        saveToBucketList: vi.fn(),
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
        bite: signal(undefined),
        saveToBucketList: vi.fn(),
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
      vi.clearAllMocks();
      TestBed.resetTestingModule();
    });

    it('should call dataAccess.createAndSaveToBucketList with correct parameters when bite exists', () => {
      // Arrange
      mockDataAccessService = {
        bite: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
        createAndSaveToBucketList: vi.fn(),
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
        bite: signal(undefined),
        createAndSaveToBucketList: vi.fn(),
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
      vi.clearAllMocks();
      TestBed.resetTestingModule();
    });

    it('should call dataAccess.removeBiteFromBucketlist with correct parameters', () => {
      // Arrange
      mockDataAccessService = {
        removeBiteFromBucketlist: vi.fn(),
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
      const likeClick = { likeType: 'like', biteId: 'bite123' };
      service.likeButtonClicked(likeClick);

      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledWith(
        likeClick,
      );
      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('should call dataAccess.logout', () => {
      service.logout();
      expect(mockDataAccessService.logout).toHaveBeenCalled();
      expect(mockDataAccessService.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation methods', () => {
    it('should navigate to settings page', () => {
      service.onGotoSettingsClick();
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'settings',
      ]);
    });

    it('should navigate to my bites page', () => {
      service.onGotoMyBitesClick();
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'my-bites',
      ]);
    });

    it('should navigate to my bucketlists page', () => {
      service.onGotoMyBucketlists();
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'my-bucketlists',
      ]);
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

  describe('onGotoMyProfileClick', () => {
    it('should navigate to my profile page', () => {
      service.onGotoMyProfileClick();
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'my-profile',
      ]);
    });
  });
});

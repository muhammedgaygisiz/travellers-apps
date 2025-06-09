import { TestBed } from '@angular/core/testing';
import { DetailsService } from '../details.service';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import { signal } from '@angular/core';
import { Bite, Bucketlist } from 'model';

describe('DetailsService', () => {
  let service: DetailsService;
  let mockDataAccessService: jest.Mocked<DetailsDataAccessService>;
  const mockBite: Bite = {
    id: 'bite123',
    name: 'Test Bite',
  } as Bite;

  beforeEach(() => {
    mockDataAccessService = {
      bite: signal(mockBite),
      saveNewTags: jest.fn(),
      saveNewReview: jest.fn(),
      saveToBucketList: jest.fn(),
      currentPosition: jest.fn(),
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
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have bite data from DetailsDataAccessService', () => {
    expect(service.bite()).toEqual(mockBite);
  });

  it('should call dataAccess.saveNewTags with provided tags', () => {
    // Arrange
    const tags = 'italian, spicy';

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
      reviewData
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
        bite: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
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
        bite: signal(undefined),
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
        bite: signal({ id: 'bite123', name: 'Test Bite' } as Bite),
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
        mockDataAccessService.createAndSaveToBucketList
      ).toHaveBeenCalledWith({
        bucketListName: 'My New List',
        biteId: 'bite123',
      });
      expect(
        mockDataAccessService.createAndSaveToBucketList
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined bite gracefully', () => {
      // Arrange
      mockDataAccessService = {
        bite: signal(undefined),
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
        mockDataAccessService.createAndSaveToBucketList
      ).toHaveBeenCalledWith({
        bucketListName: 'My New List',
        biteId: undefined,
      });
      expect(
        mockDataAccessService.createAndSaveToBucketList
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

      const params = {
        bucketListId: 'list123',
        biteId: 'bite123',
      };

      // Act
      service.removeBiteFromBucketlist(params);

      // Assert
      expect(
        mockDataAccessService.removeBiteFromBucketlist
      ).toHaveBeenCalledWith(params);
      expect(
        mockDataAccessService.removeBiteFromBucketlist
      ).toHaveBeenCalledTimes(1);
    });
  });
});

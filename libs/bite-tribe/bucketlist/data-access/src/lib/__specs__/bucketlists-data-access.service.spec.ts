import { BucketlistsDataAccessService } from '../bucketlists-data-access.service';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';

const createBucketListMock = jest.fn();
const setBucketlistSortingMock = jest.fn();
const navigateForwardMock = jest.fn();
const deleteBucketlistMock = jest.fn();
const updateBucketlistNameMock = jest.fn();
const removeBiteFromBucketlistMock = jest.fn();
const getDocumentMock = jest.fn();
const setDocumentMock = jest.fn();
const handleErrorMock = jest.fn();

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getDocument: (...args: unknown[]): unknown => getDocumentMock(...args),
    setDocument: (...args: unknown[]): unknown => setDocumentMock(...args),
  },
}));

const Mock = {
  sortedBucketlists$: of(undefined),
  bucketlistSorting$: of(undefined),
  selectedBucketlist$: of(undefined),
  bitesBySelectedBucketlist$: of([]),
  userId$: of('user-123'),
  createBucketList: createBucketListMock,
  setBucketlistSorting: setBucketlistSortingMock,
  navigateForward: navigateForwardMock,
  deleteBucketlist: deleteBucketlistMock,
  updateBucketlistName: updateBucketlistNameMock,
  removeBiteFromBucketlist: removeBiteFromBucketlistMock,
};

describe('BucketlistsDataAccessService', () => {
  let service: BucketlistsDataAccessService;

  beforeEach(() => {
    getDocumentMock.mockReset();
    setDocumentMock.mockReset();
    handleErrorMock.mockReset();

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeStoreService, useValue: Mock },
        { provide: ErrorHandler, useValue: { handleError: handleErrorMock } },
      ],
    }).compileComponents();

    service = TestBed.inject<BucketlistsDataAccessService>(
      BucketlistsDataAccessService,
    );
  });

  describe('createAndSaveToBucketList', () => {
    it('should call createBucketList with correct value', () => {
      const bucketListName = 'New Bucket List';
      service.createAndSaveToBucketList(bucketListName);
      expect(createBucketListMock).toHaveBeenCalledWith(bucketListName);
    });
  });

  describe('setBucketlistSorting', () => {
    it('should call setBucketlistSorting with correct value', () => {
      const sortingValue = 'newest';
      service.setBucketlistSorting(sortingValue);
      expect(setBucketlistSortingMock).toHaveBeenCalledWith(sortingValue);
    });
  });

  describe('deleteBucketlist', () => {
    it('should call deleteBucketlist with correct bucketlistId', () => {
      const bucketlistId = 'bucket-123';
      service.deleteBucketlist(bucketlistId);
      expect(deleteBucketlistMock).toHaveBeenCalledWith(bucketlistId);
    });
  });

  describe('updateBucketlistName', () => {
    it('should call updateBucketlistName with correct parameters', () => {
      const bucketlistId = 'bucket-123';
      const name = 'New Name';
      service.updateBucketlistName(bucketlistId, name);
      expect(updateBucketlistNameMock).toHaveBeenCalledWith(bucketlistId, name);
    });
  });

  describe('removeBiteFromBucketlist', () => {
    it('should call removeBiteFromBucketlist with correct parameters', () => {
      const params = { biteId: 'bite-123', bucketlistId: 'bucket-123' };
      service.removeBiteFromBucketlist(params);
      expect(removeBiteFromBucketlistMock).toHaveBeenCalledWith(params);
    });
  });

  describe('getOwnBiteTrailRating', () => {
    it('should return undefined when no rating exists', async () => {
      getDocumentMock.mockResolvedValue({ snapshot: { data: undefined } });

      const result = await service.getOwnBiteTrailRating('trail-1');

      expect(result).toBeUndefined();
      expect(getDocumentMock).toHaveBeenCalledWith({
        reference: 'biteTrails/trail-1/ratings/user-123',
      });
    });

    it('should return rating when document exists', async () => {
      getDocumentMock.mockResolvedValue({
        snapshot: { data: { rating: 5, review: 'Great!' } },
      });

      const result = await service.getOwnBiteTrailRating('trail-1');

      expect(result).toEqual({ rating: 5, review: 'Great!' });
    });
  });

  describe('createOwnBiteTrailRating', () => {
    it('should return false when rating already exists', async () => {
      getDocumentMock.mockResolvedValue({
        snapshot: { data: { rating: 4, review: 'Existing' } },
      });

      const result = await service.createOwnBiteTrailRating({
        biteTrailId: 'trail-1',
        rating: 5,
        review: 'Great!',
      });

      expect(result).toBe(false);
      expect(setDocumentMock).not.toHaveBeenCalled();
    });

    it('should create rating when no rating exists', async () => {
      getDocumentMock.mockResolvedValue({ snapshot: { data: undefined } });

      const result = await service.createOwnBiteTrailRating({
        biteTrailId: 'trail-1',
        rating: 5,
        review: 'Great!',
      });

      expect(result).toBe(true);
      expect(setDocumentMock).toHaveBeenCalledWith({
        reference: 'biteTrails/trail-1/ratings/user-123',
        data: expect.objectContaining({
          biteTrailId: 'trail-1',
          authorId: 'user-123',
          rating: 5,
          review: 'Great!',
        }),
      });
    });
  });
});

import { BucketlistsDataAccessService } from '../bucketlists-data-access.service';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';

const createBucketListMock = jest.fn();
const setBucketlistSortingMock = jest.fn();
const navigateForwardMock = jest.fn();
const deleteBucketlistMock = jest.fn();
const updateBucketlistNameMock = jest.fn();
const removeBiteFromBucketlistMock = jest.fn();
const Mock = {
  sortedBucketlists$: of(undefined),
  bucketlistSorting$: of(undefined),
  selectedBucketlist$: of(undefined),
  bitesBySelectedBucketlist$: of([]),
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
    TestBed.configureTestingModule({
      providers: [{ provide: BiteTribeStoreService, useValue: Mock }],
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
});

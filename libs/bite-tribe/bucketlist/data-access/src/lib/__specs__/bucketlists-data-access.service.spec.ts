import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BucketlistsDataAccessService } from '../bucketlists-data-access.service';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';

vi.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: vi.fn().mockImplementation(() => ({})),
}));

const createBucketListMock = vi.fn();
const setBucketlistSortingMock = vi.fn();
const navigateForwardMock = vi.fn();

const Mock = {
  sortedBucketlists$: of(undefined),
  bucketlistSorting$: of(undefined),
  createBucketList: createBucketListMock,
  setBucketlistSorting: setBucketlistSortingMock,
  navigateForward: navigateForwardMock,
};

describe(BucketlistsDataAccessService.name, () => {
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
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BucketlistsService } from '../bucketlists.service';
import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';

const setBucketlistSortingMock = vi.fn();
const navigateForwardMock = vi.fn();
const createAndSaveToBucketListMock = vi.fn();
const Mock = {
  setBucketlistSorting: setBucketlistSortingMock,
  createAndSaveToBucketList: createAndSaveToBucketListMock,
  navigateForward: navigateForwardMock,
};

describe('BucketlistsService', () => {
  let service: BucketlistsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BucketlistsDataAccessService, useValue: Mock },
        { provide: NavController, useValue: Mock },
      ],
    }).compileComponents();

    service = TestBed.inject<BucketlistsService>(BucketlistsService);
  });

  describe('gotoBucketlistDetails', () => {
    it('should call navigateForward with correct parameters', () => {
      const bucketlistId = '12345';
      service.gotoBucketlistDetails(bucketlistId);
      expect(navigateForwardMock).toHaveBeenCalledWith([
        'my-bucketlists',
        bucketlistId,
      ]);
    });
  });

  describe('createAndSaveToBucketList', () => {
    it('should call createAndSaveToBucketList with correct value', () => {
      const bucketListName = 'New Bucket List';
      service.createAndSaveToBucketList(bucketListName);
      expect(createAndSaveToBucketListMock).toHaveBeenCalledWith(
        bucketListName,
      );
    });
  });

  describe('sortingChange', () => {
    it('should call setBucketlistSorting with correct value', () => {
      const sortingValue = 'newest';
      service.sortingChange(sortingValue);
      expect(setBucketlistSortingMock).toHaveBeenCalledWith(sortingValue);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { BiteTrailService } from '../bite-trail.service';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import type { Bite } from 'model';
import { PATH } from 'utils';

const mockSaveBiteTrailAsBucketList = jest.fn();
const mockNavigateForward = jest.fn();
const mockDataAccess = {
  biteTrailName: signal('Test Trail'),
  userId: signal('user-1'),
  isAuthenticated: signal(true),
  biteTrailIdFromUrl: signal<string | undefined>('trail-1'),
  isFree: signal(false),
  savedBucketlistId: signal<string | null>(null),
  clearFilters: jest.fn(),
  saveBiteTrailAsBucketList: mockSaveBiteTrailAsBucketList,
};

describe(BiteTrailService.name, () => {
  let service: BiteTrailService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        BiteTrailService,
        { provide: BiteTrailDataAccessService, useValue: mockDataAccess },
        {
          provide: NavController,
          useValue: { navigateForward: mockNavigateForward },
        },
      ],
    });
    service = TestBed.inject(BiteTrailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('biteClicked', () => {
    it('should navigate to the bite page', () => {
      const bite = { id: 'bite-123' } as Bite;
      service.biteClicked(bite);
      expect(mockNavigateForward).toHaveBeenCalledWith([PATH.BITE, 'bite-123']);
    });
  });

  describe('restaurantClicked', () => {
    it('should navigate with restaurantId extracted from restaurantId path', () => {
      const bite = {
        id: 'bite-1',
        restaurantId: 'rest-1',
        place: 'Test',
      } as Bite;
      service.restaurantClicked(bite);
      expect(mockNavigateForward).toHaveBeenCalledWith([
        PATH.BITE,
        'bite-1',
        PATH.RESTAURANT,
        'rest-1',
      ]);
    });

    it('should navigate with encoded place name when no restaurantId', () => {
      const bite = { id: 'bite-1', place: 'Nice Place' } as Bite;
      service.restaurantClicked(bite);
      expect(mockNavigateForward).toHaveBeenCalledWith([
        PATH.BITE,
        'bite-1',
        PATH.RESTAURANT,
        PATH.PLACE,
        encodeURIComponent('Nice Place'),
      ]);
    });
  });

  describe('openMapView', () => {
    it('should navigate to map view when biteTrailId is set', () => {
      service.openMapView();
      expect(mockNavigateForward).toHaveBeenCalledWith([
        PATH.BITE_TRAIL,
        'trail-1',
        'map-view',
      ]);
    });

    it('should not navigate when biteTrailId is undefined', () => {
      mockDataAccess.biteTrailIdFromUrl.set(undefined);
      service.openMapView();
      expect(mockNavigateForward).not.toHaveBeenCalled();
      // Restore
      mockDataAccess.biteTrailIdFromUrl.set('trail-1');
    });
  });

  describe('getForFree', () => {
    it('should call saveBiteTrailAsBucketList on data access', () => {
      service.getForFree();
      expect(mockSaveBiteTrailAsBucketList).toHaveBeenCalled();
    });
  });

  describe('goToSavedBucketList', () => {
    it('should navigate to the saved bucket list when savedBucketlistId is set', () => {
      mockDataAccess.savedBucketlistId.set('bl-42');
      service.goToSavedBucketList();
      expect(mockNavigateForward).toHaveBeenCalledWith([
        PATH.MY_BUCKETLISTS,
        'bl-42',
      ]);
    });

    it('should not navigate when savedBucketlistId is null', () => {
      mockDataAccess.savedBucketlistId.set(null);
      service.goToSavedBucketList();
      expect(mockNavigateForward).not.toHaveBeenCalled();
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { BiteTrailDataAccessService } from '../bite-trail-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { signal } from '@angular/core';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getDocument: jest.fn(),
  },
}));

const mockStoreService = {
  biteTrailIdFromUrl: signal<string | undefined>(undefined),
  userId$: of(''),
  isAuthenticated$: of(false),
  position$: of(null),
};

describe(BiteTrailDataAccessService.name, () => {
  let service: BiteTrailDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BiteTrailDataAccessService,
        { provide: BiteTribeStoreService, useValue: mockStoreService },
      ],
    });

    service = TestBed.inject(BiteTrailDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setSorting', () => {
    it('should update sorting signal', () => {
      service.setSorting('likes');

      expect(service.sorting()).toBe('likes');
    });
  });

  describe('setFilters', () => {
    it('should update tag filters', () => {
      service.setFilters({
        tagFilters: ['pizza', 'italian'],
        distanceFilter: '',
        priceFilter: 0,
      });

      expect(service.tagFilters()).toEqual(['pizza', 'italian']);
    });
  });

  describe('clearFilters', () => {
    it('should reset tag filters to empty', () => {
      service.setFilters({
        tagFilters: ['pizza'],
        distanceFilter: '',
        priceFilter: 0,
      });
      service.clearFilters();

      expect(service.tagFilters()).toEqual([]);
    });
  });

  describe('biteTrailName', () => {
    it('should return empty string when no bite trail loaded', () => {
      expect(service.biteTrailName()).toBe('');
    });
  });
});

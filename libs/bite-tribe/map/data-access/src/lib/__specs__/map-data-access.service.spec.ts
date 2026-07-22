import { of } from 'rxjs';
import { MapDataAccessService } from '../map-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import type { LikeClick } from 'model';

class Mock {
  bites$ = of([]);
  sortedMyBites$ = of([]);
  bitesBySelectedBucketlist$ = of([]);
  userId$ = of('test-user-id');
  selectedBucketlist$ = of(null);
  isAuthenticated$ = of(false);
  position$ = of(null);
  logout = (): null => null;
  submitLikeClick = (): null => null;
}

describe(MapDataAccessService.name, () => {
  let biteTribeStoreService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MapDataAccessService,
        provideMockStore(),
        { provide: BiteTribeStoreService, useClass: Mock },
      ],
    }).compileComponents();
    biteTribeStoreService = TestBed.inject(BiteTribeStoreService);
  });

  it('should create the service', inject(
    [MapDataAccessService],
    (service: MapDataAccessService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('logout', () => {
    it('should call logout on BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const logoutSpy = jest.spyOn(biteTribeStoreService, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitLikeClick', () => {
    it('should forward the like click to BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const submitLikeClickSpy = jest
          .spyOn(biteTribeStoreService, 'submitLikeClick')
          .mockImplementation();
        const likeClick: LikeClick = {
          likeType: 'thumbup',
          biteId: '456',
          action: 'save',
        };

        service.submitLikeClick(likeClick);

        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeClick);
      },
    ));
  });
});

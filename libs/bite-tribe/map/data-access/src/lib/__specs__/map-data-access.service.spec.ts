import { of } from 'rxjs';
import { MapDataAccessService } from '../map-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Bite, Like } from 'model';

class Mock {
  bites$ = of([]);
  userId$ = of('test-user-id');
  selectedBucketlist$ = of(null);
  isAuthenticated$ = of(false);
  position$ = of(null);
  logout = (): null => null;
  submitLikeOrDislikeClick = (): null => null;
}

describe('MapDataAccessService', () => {
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
    }
  ));

  describe('logout', () => {
    it('should call logout on BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const logoutSpy = jest.spyOn(biteTribeStoreService, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      }
    ));
  });

  describe('submitLikeClick', () => {
    const likeType = { likeType: 'dislike', biteId: '456' };
    const like = {
      biteId: likeType.biteId,
      userId: 'userId',
      likeType: likeType.likeType,
    } as unknown as Like;
    const bite = {
      id: like.biteId,
      userId: like.userId,
      likes: [like],
    } as Bite;

    beforeEach(inject(
      [BiteTribeStoreService],
      (storeService: BiteTribeStoreService) => {
        storeService.bites$ = of([bite]);
        storeService.userId$ = of('userId');
      }
    ));

    it('should call submitLikeClick on BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const likeType = { likeType: 'like', biteId: '456' };
        const submitLikeOrDislikeClickSpy = jest.spyOn(
          biteTribeStoreService,
          'submitLikeOrDislikeClick'
        );
        service.submitLikeClick(likeType);
        expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledWith(
          bite,
          'userId',
          likeType
        );
      }
    ));
  });
});

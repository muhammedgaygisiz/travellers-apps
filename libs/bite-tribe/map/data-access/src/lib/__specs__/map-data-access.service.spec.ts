import { of } from 'rxjs';
import { MapDataAccessService } from '../map-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import type { Bite, Like } from 'model';
import SpyInstance = jest.SpyInstance;

class Mock {
  bites$ = of([]);
  userId$ = of('test-user-id');
  selectedBucketlist$ = of(null);
  isAuthenticated$ = of(false);
  position$ = of(null);
  userHasSubscriptionTierOne$ = of(false);
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
    let submitLikeOrDislikeClickSpy: SpyInstance;

    beforeEach(inject(
      [BiteTribeStoreService],
      (storeService: BiteTribeStoreService) => {
        storeService.bites$ = of([bite]);
        storeService.userId$ = of('userId');
        submitLikeOrDislikeClickSpy = jest
          .spyOn(storeService, 'submitLikeOrDislikeClick')
          .mockImplementation();
      },
    ));

    it('should call submitLikeOrDislikeClick when bite is found', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const likeClick = { likeType: 'like', biteId: '456' };

        service.submitLikeClick(likeClick);

        expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledTimes(1);
        expect(
          biteTribeStoreService.submitLikeOrDislikeClick,
        ).toHaveBeenCalledWith(bite, 'userId', likeClick);
      },
    ));

    it('should call submitLikeOrDislikeClick with undefined bite when bite is not found', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const likeClick = { likeType: 'like', biteId: 'nonexistent-bite-id' };

        service.submitLikeClick(likeClick);

        expect(
          biteTribeStoreService.submitLikeOrDislikeClick,
        ).toHaveBeenCalledTimes(1);
        expect(
          biteTribeStoreService.submitLikeOrDislikeClick,
        ).toHaveBeenCalledWith(undefined, 'userId', likeClick);
      },
    ));

    describe('with empty bites', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.bites$ = of([]);
        },
      ));

      it('should handle empty bites array', inject(
        [MapDataAccessService],
        (service: MapDataAccessService) => {
          const likeClick = { likeType: 'like', biteId: '456' };

          service.submitLikeClick(likeClick);

          expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledWith(
            undefined,
            'userId',
            likeClick,
          );
        },
      ));
    });

    describe('with no bites', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.bites$ = of(undefined as any);
        },
      ));

      it('should handle empty bites array', inject(
        [MapDataAccessService],
        (service: MapDataAccessService) => {
          const likeClick = { likeType: 'like', biteId: '456' };

          service.submitLikeClick(likeClick);

          expect(submitLikeOrDislikeClickSpy).toHaveBeenCalledWith(
            undefined,
            'userId',
            likeClick,
          );
        },
      ));
    });

    describe('given no user id', () => {
      beforeEach(inject(
        [BiteTribeStoreService],
        (storeService: BiteTribeStoreService) => {
          storeService.userId$ = of('');
        },
      ));

      it('should not call submitLikeOrDislikeClick', inject(
        [MapDataAccessService],
        (service: MapDataAccessService) => {
          const likeClick = { likeType: 'like', biteId: '456' };

          service.submitLikeClick(likeClick);

          expect(submitLikeOrDislikeClickSpy).not.toHaveBeenCalled();
        },
      ));
    });
  });
});

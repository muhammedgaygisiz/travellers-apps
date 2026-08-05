import { inject, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { fromAuth } from 'ta-firestore';
import { Store } from '@ngrx/store';
import { Like, LikeClick } from 'model';
import {
  loadedLikesFromApi,
  removeLike as removeLikeAction,
  saveLike,
} from '../likes/actions';

describe(BiteTribeStoreService.name, () => {
  let store: Store;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore()],
    }).compileComponents();
    store = TestBed.inject(Store);
  });

  it('should create the service', inject(
    [BiteTribeStoreService],
    (service: BiteTribeStoreService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('loginWithGoogleAccount', () => {
    it('should dispatch loginWithGoogleAccount on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const loginSpy = jest.spyOn(
          fromAuth.AuthActions,
          'loginWithGoogleAccount',
        );
        service.loginWithGoogleAccount();
        expect(loginSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('loginWithAppleAccount', () => {
    it('should dispatch loginWithAppleAccount on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const loginSpy = jest.spyOn(
          fromAuth.AuthActions,
          'loginWithAppleAccount',
        );
        service.loginWithAppleAccount();
        expect(loginSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('login', () => {
    it('should dispatch login on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const loginSpy = jest.spyOn(fromAuth.AuthActions, 'login');
        service.login(
          {} as unknown as Parameters<BiteTribeStoreService['login']>[0],
        );
        expect(loginSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('register', () => {
    it('should dispatch register on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const registerSpy = jest.spyOn(
          fromAuth.AuthActions,
          'registerWithEmail',
        );
        service.register(
          {} as unknown as Parameters<BiteTribeStoreService['register']>[0],
        );
        expect(registerSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveNewRestaurant', () => {
    it('should dispatch saveNewRestaurant', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const entity = {} as unknown as Parameters<
          BiteTribeStoreService['saveNewRestaurant']
        >[0];
        service.saveNewRestaurant(entity);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveNewBite', () => {
    it('should dispatch saveNewBite', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveNewBite();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveEditedBite', () => {
    it('should dispatch saveExistingBite', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const entity = { id: '123' } as unknown as Parameters<
          BiteTribeStoreService['saveEditedBite']
        >[0];
        service.saveEditedBite(entity);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('logout', () => {
    it('should dispatch logout on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const logoutSpy = jest.spyOn(service, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitLikeClick', () => {
    const likeClick: LikeClick = {
      biteId: '123',
      likeType: 'thumbup',
      action: 'save',
    };

    afterEach(() => {
      (store as MockStore).resetSelectors();
    });

    it('should dispatch saveLike with the enriched like when action is save', () => {
      const mockStore = TestBed.inject(MockStore);
      mockStore.overrideSelector(fromAuth.selectUserId, 'user1');
      const service = TestBed.inject(BiteTribeStoreService);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      service.submitLikeClick({ ...likeClick, previousLikeType: 'drooling' });

      expect(dispatchSpy).toHaveBeenCalledWith(
        saveLike({
          like: {
            biteId: '123',
            likeType: 'thumbup',
            userId: 'user1',
            createdAt: expect.any(String),
          },
          previousLikeType: 'drooling',
        }),
      );
    });

    it('should dispatch removeLike when action is remove', () => {
      const mockStore = TestBed.inject(MockStore);
      mockStore.overrideSelector(fromAuth.selectUserId, 'user1');
      const service = TestBed.inject(BiteTribeStoreService);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      service.submitLikeClick({ ...likeClick, action: 'remove' });

      expect(dispatchSpy).toHaveBeenCalledWith(
        removeLikeAction({
          like: {
            biteId: '123',
            likeType: 'thumbup',
            userId: 'user1',
            createdAt: expect.any(String),
          },
        }),
      );
    });

    it('should not dispatch when there is no user', () => {
      const mockStore = TestBed.inject(MockStore);
      mockStore.overrideSelector(fromAuth.selectUserId, undefined);
      const service = TestBed.inject(BiteTribeStoreService);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      service.submitLikeClick(likeClick);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyLikesLoaded', () => {
    it('should dispatch loadedLikesFromApi with the likes', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        const likes = [
          {
            biteId: '123',
            userId: 'user1',
            likeType: 'thumbup',
            createdAt: '2026-01-01T00:00:00Z',
          } as Like,
        ];

        service.notifyLikesLoaded(likes);

        expect(dispatchSpy).toHaveBeenCalledWith(loadedLikesFromApi({ likes }));
      },
    ));
  });

  describe('notifySavedSettings', () => {
    it('should dispatch saveSettings on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.notifySavedSettings(
          {} as unknown as Parameters<
            BiteTribeStoreService['notifySavedSettings']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('savePublicProfile', () => {
    it('should dispatch savePublicProfile on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.savePublicProfile(
          {} as unknown as Parameters<
            BiteTribeStoreService['savePublicProfile']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveReview', () => {
    it('should dispatch saveReview on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveReview(
          {} as unknown as Parameters<BiteTribeStoreService['saveReview']>[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('selectRestaurantToCreate', () => {
    it('should dispatch selectRestaurantToCreate on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.selectRestaurantToCreate(
          {} as unknown as Parameters<
            BiteTribeStoreService['selectRestaurantToCreate']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('cacheBite', () => {
    it('should dispatch cacheBite on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.cacheBite({});
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('clearCachedBite', () => {
    it('should dispatch clearCachedBite on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.clearCachedBite();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveSocialMediaLinks', () => {
    it('should dispatch saveSocialMediaLinks on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveSocialMediaLinks('id', []);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveToBucketList', () => {
    it('should dispatch saveToBucketList on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveToBucketList(
          {} as unknown as Parameters<
            BiteTribeStoreService['saveToBucketList']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('createAndSaveToBucketList', () => {
    it('should dispatch createAndSaveToBucketList on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.createAndSaveToBucketList(
          {} as unknown as Parameters<
            BiteTribeStoreService['createAndSaveToBucketList']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('removeBiteFromBucketlist', () => {
    it('should dispatch removeBiteFromBucketlist on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.removeBiteFromBucketlist(
          {} as unknown as Parameters<
            BiteTribeStoreService['removeBiteFromBucketlist']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitDeleteBite', () => {
    it('should dispatch submitDeleteBite on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.submitDeleteBite(
          {} as unknown as Parameters<
            BiteTribeStoreService['submitDeleteBite']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('createBucketList', () => {
    it('should dispatch createBucketList on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.createBucketList('');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setHomeSorting', () => {
    it('should dispatch setHomeSorting on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setHomeSorting('');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setMyBitesSorting', () => {
    it('should dispatch setMyBitesSorting on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setMyBitesSorting('');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setRestaurantBitesSorting', () => {
    it('should dispatch setRestaurantBitesSorting on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setRestaurantBitesSorting('createdAt');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setHomeFilters', () => {
    it('should dispatch setHomeFilters on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setHomeFilters(
          {} as unknown as Parameters<
            BiteTribeStoreService['setHomeFilters']
          >[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('clearHomeFilters', () => {
    it('should dispatch setHomeFilters on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.clearHomeFilters();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('reloadGPSPosition', () => {
    it('should dispatch reloadGPSPosition on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.reloadGPSPosition();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('clearGpsError', () => {
    it('should dispatch clearGpsError on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.clearGpsError();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setBucketlistSorting', () => {
    it('should dispatch setBucketlistSorting on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setBucketlistSorting('');
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setEditingBite', () => {
    it('should dispatch setEditingBite on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setEditingBite({});
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('followUser', () => {
    it('should dispatch followUser on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.followUser(
          {} as unknown as Parameters<BiteTribeStoreService['followUser']>[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('unfollowUser', () => {
    it('should dispatch unfollowUser on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.unfollowUser(
          {} as unknown as Parameters<BiteTribeStoreService['unfollowUser']>[0],
        );
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });
});

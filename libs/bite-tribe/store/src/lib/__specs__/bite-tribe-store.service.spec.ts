import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { fromAuth } from 'ta-firestore';
import { Store } from '@ngrx/store';

describe('BiteTribeStoreService', () => {
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
        service.login({} as any);
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
        service.register({} as any);
        expect(registerSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('confirmError', () => {
    it('should throw an error when confirmError is called', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        expect(() => service.confirmError()).toThrow('Method not implemented.');
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

  describe('submitLikeOrDislikeClick', () => {
    const userId = 'user1';
    const likeType = { likeType: 'like', biteId: '123' };

    it('should call removeLike if likeFromUser exists', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const removeLikeSpy = jest.spyOn(service, 'removeLike');
        const bite = {
          likes: [{ userId: 'user1', likeType: 'like' }],
        } as any;
        service.submitLikeOrDislikeClick(bite, userId, likeType);
        expect(removeLikeSpy).toHaveBeenCalledTimes(1);
        expect(removeLikeSpy).toHaveBeenCalledWith(likeType);
      },
    ));

    it('should call submitLikeClick if likeFromUser does not exist', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const submitLikeClickSpy = jest.spyOn(service, 'submitLikeClick');
        const bite = {
          likes: [{ userId: 'user2', likeType: 'like' }],
        } as any;
        service.submitLikeOrDislikeClick(bite, userId, likeType);
        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeType);
      },
    ));

    it('should call submitLikeClick if bite is null', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const submitLikeClickSpy = jest.spyOn(service, 'submitLikeClick');
        service.submitLikeOrDislikeClick(null, userId, likeType);
        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeType);
      },
    ));

    it('should call submitLikeClick if bite likes is undefined', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const submitLikeClickSpy = jest.spyOn(service, 'submitLikeClick');
        const bite = {} as any;
        service.submitLikeOrDislikeClick(bite, userId, likeType);
        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeType);
      },
    ));
  });

  describe('submitLikeClick', () => {
    it('should dispatch submitLikeClick on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const likeType = { likeType: 'like', biteId: '123' };
        const submitLikeClickSpy = jest.spyOn(service, 'submitLikeClick');
        service.submitLikeClick(likeType);
        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeType);
      },
    ));
  });

  describe('removeLike', () => {
    it('should dispatch removeLike on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.removeLike({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveSettings', () => {
    it('should dispatch saveSettings on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveSettings({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('savePublicProfile', () => {
    it('should dispatch savePublicProfile on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.savePublicProfile({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveReview', () => {
    it('should dispatch saveReview on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveReview({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('selectRestaurantToCreate', () => {
    it('should dispatch selectRestaurantToCreate on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.selectRestaurantToCreate({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveMenu', () => {
    it('should dispatch saveMenu on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.saveMenu({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('prepareBiteFromMenuItem', () => {
    it('should dispatch prepareBiteFromMenuItem on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.prepareBiteFromMenuItem({} as any);
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
        service.saveToBucketList({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('createAndSaveToBucketList', () => {
    it('should dispatch createAndSaveToBucketList on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.createAndSaveToBucketList({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('removeBiteFromBucketlist', () => {
    it('should dispatch removeBiteFromBucketlist on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.removeBiteFromBucketlist({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitDeleteBite', () => {
    it('should dispatch submitDeleteBite on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.submitDeleteBite({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('createBucketList', () => {
    it('should dispatch createBucketList on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.createBucketList({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('goPublic', () => {
    it('should dispatch goPublic on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.goPublic();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('goPrivate', () => {
    it('should dispatch goPrivate on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.goPrivate();
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setHomeSorting', () => {
    it('should dispatch setHomeSorting on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setHomeSorting({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setMyBitesSorting', () => {
    it('should dispatch setMyBitesSorting on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setMyBitesSorting({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setHomeFilters', () => {
    it('should dispatch setHomeFilters on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setHomeFilters({} as any);
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
        service.setBucketlistSorting({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('setEditingBite', () => {
    it('should dispatch setEditingBite on BiteTribeStoreService', inject(
      [BiteTribeStoreService],
      (service: BiteTribeStoreService) => {
        const dispatchSpy = jest.spyOn(store, 'dispatch');
        service.setEditingBite({} as any);
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });
});

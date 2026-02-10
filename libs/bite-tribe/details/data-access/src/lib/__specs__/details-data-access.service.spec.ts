import { DetailsDataAccessService } from '../details-data-access.service';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Geolocation } from '@capacitor/geolocation';

jest.mock('bite-tribe/store');
jest.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCollection: jest.fn(),
    getDocument: jest.fn(),
  },
}));
jest.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: jest.fn(),
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
  },
}));

describe(DetailsDataAccessService.name, () => {
  let service: DetailsDataAccessService;
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DetailsDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            reviews$: of(),
            bucketlists$: of(),
            exchangeRates$: of(),
            preferedCurrency$: of(),
            userId$: of(),
            isAuthenticated$: of(),
            saveReview: jest.fn(),
            saveToBucketList: jest.fn(),
            createAndSaveToBucketList: jest.fn(),
            removeBiteFromBucketlist: jest.fn(),
            logout: jest.fn(),
            submitLikeClick: jest.fn(),
            removeLike: jest.fn(),
            biteIdFromUrl: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(DetailsDataAccessService);
    storeService = TestBed.inject(BiteTribeStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('biteLoader', () => {
    describe('given no bite id', () => {
      it('should return undefined', async () => {
        const result = await service.biteLoader({ params: {} } as any);
        expect(result).toBeUndefined();
      });
    });

    describe('given a bite id', () => {
      let getCollectionSpy: jest.SpyInstance;
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({ snapshots: [] } as any);

        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: { data: {}, id: '' } as unknown as any,
          });
      });

      it('should load the bite with likes', async () => {
        await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
          },
        } as any);

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id/likes',
        });

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id',
        });
      });
    });
  });

  describe('biteCreatorLoader', () => {
    describe('given no user id', () => {
      it('should return undefined', async () => {
        const result = await service.biteCreatorLoader({ params: {} } as any);
        expect(result).toBeUndefined();
      });
    });

    describe('given a user id', () => {
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: { data: {}, id: '' } as unknown as any,
          });
      });

      it('should load the user document', async () => {
        await service.biteCreatorLoader({
          params: {
            userId: 'test-user-id',
          },
        } as any);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'users/test-user-id',
        });
      });
    });
  });

  describe('positionLoader', () => {
    describe('given no permissions', () => {
      let checkPermissionsSpy: jest.SpyInstance;
      let requestPermissionsSpy: jest.SpyInstance;
      let getCurrentPositionSpy: jest.SpyInstance;

      beforeEach(() => {
        checkPermissionsSpy = jest
          .spyOn(Geolocation, 'checkPermissions')
          .mockReturnValue({ location: 'denied' } as any);
        requestPermissionsSpy = jest
          .spyOn(Geolocation, 'requestPermissions')
          .mockResolvedValue({} as any);
        getCurrentPositionSpy = jest
          .spyOn(Geolocation, 'getCurrentPosition')
          .mockReturnValue({} as any);
      });

      it('should call request permissions and get current position', async () => {
        await service.positionLoader({} as any);

        expect(checkPermissionsSpy).toHaveBeenCalled();
        expect(requestPermissionsSpy).toHaveBeenCalled();
        expect(getCurrentPositionSpy).toHaveBeenCalled();
      });
    });
  });

  describe('saveNewReview', () => {
    let saveReviewSpy: jest.SpyInstance;

    beforeEach(() => {
      saveReviewSpy = jest.spyOn(storeService, 'saveReview');
    });

    it('should call saveReview on store service', () => {
      const newReview = { review: 'Great bite!', biteId: 'test-bite-id' };
      service.saveNewReview(newReview);
      expect(saveReviewSpy).toHaveBeenCalledWith(newReview);
    });
  });

  describe('saveToBucketList', () => {
    let saveToBucketListSpy: jest.SpyInstance;

    beforeEach(() => {
      saveToBucketListSpy = jest.spyOn(storeService, 'saveToBucketList');
    });

    it('should call saveToBucketList on store service', () => {
      const event = {
        bucketListId: 'test-bucketlist-id',
        biteId: 'test-bite-id',
      };
      service.saveToBucketList(event);
      expect(saveToBucketListSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('createAndSaveToBucketList', () => {
    let createAndSaveToBucketListSpy: jest.SpyInstance;

    beforeEach(() => {
      createAndSaveToBucketListSpy = jest.spyOn(
        storeService,
        'createAndSaveToBucketList',
      );
    });

    it('should call createAndSaveToBucketList on store service', () => {
      const param = {
        bucketListName: 'My Bucket List',
        biteId: 'test-bite-id',
      };
      service.createAndSaveToBucketList(param);
      expect(createAndSaveToBucketListSpy).toHaveBeenCalledWith(param);
    });
  });

  describe('removeBiteFromBucketlist', () => {
    let removeBiteFromBucketlistSpy: jest.SpyInstance;

    beforeEach(() => {
      removeBiteFromBucketlistSpy = jest.spyOn(
        storeService,
        'removeBiteFromBucketlist',
      );
    });

    it('should call removeBiteFromBucketlist on store service', () => {
      const event = {
        bucketListId: 'test-bucketlist-id',
        biteId: 'test-bite-id',
      };
      service.removeBiteFromBucketlist(event as any);
      expect(removeBiteFromBucketlistSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('logout', () => {
    let logoutSpy: jest.SpyInstance;

    beforeEach(() => {
      logoutSpy = jest.spyOn(storeService, 'logout');
    });

    it('should call logout on store service', () => {
      service.logout();
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('submitLikeClick', () => {
    describe('given no bite and user id', () => {
      let submitLikeClickSpy: jest.SpyInstance;

      beforeEach(() => {
        submitLikeClickSpy = jest.spyOn(storeService, 'submitLikeClick');
      });

      it('should not call submitLikeClick', () => {
        service.submitLikeClick({ likeType: 'like' } as any);

        expect(submitLikeClickSpy).not.toHaveBeenCalled();
      });
    });

    describe('given a bite without likes', () => {
      let submitLikeClickSpy: jest.SpyInstance;

      beforeEach(() => {
        submitLikeClickSpy = jest.spyOn(storeService, 'submitLikeClick');
        service.bite = {
          value: () => ({ id: 'test-bite-id' }) as any,
        } as any;
        jest.spyOn(service, 'userId').mockReturnValue('test-user-id');
      });

      it('should call submitLikeClick with like type', () => {
        service.submitLikeClick({ likeType: 'like' } as any);

        expect(submitLikeClickSpy).toHaveBeenCalledWith({ likeType: 'like' });
      });
    });

    describe('given a like from user exists', () => {
      let removeLikeSpy: jest.SpyInstance;

      beforeEach(() => {
        removeLikeSpy = jest.spyOn(storeService, 'removeLike');
        service.bite = {
          value: () =>
            ({
              id: 'test-bite-id',
              likes: [{ userId: 'test-user-id', likeType: 'like' }],
            }) as any,
        } as any;
        jest.spyOn(service, 'userId').mockReturnValue('test-user-id');
      });

      it('should call removeLike with like type', () => {
        service.submitLikeClick({ likeType: 'like' } as any);

        expect(removeLikeSpy).toHaveBeenCalledWith({ likeType: 'like' });
      });
    });
  });
});

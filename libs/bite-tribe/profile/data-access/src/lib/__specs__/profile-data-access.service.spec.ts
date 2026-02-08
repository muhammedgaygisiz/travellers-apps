import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { ProfileDataAccessService } from '../profile-data-access.service';
import SpyInstance = jest.SpyInstance;
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

class Mock {
  isAuthenticated$ = of(true);
  bitesByUser$ = of([]);
  publicUser$ = of(null);
  mybites$ = of([]);
  bites$ = of([]);
  biteCreator$ = of(null);
  userId$ = of('user-id');
  isPublicProfile$ = of(true);
  profileMeatadata$ = of(true);
  userByUrlParam$ = of(null);
  logout = jest.fn();
  removeLike = jest.fn();
  submitLikeClick = jest.fn();
  submitFollowClick = jest.fn();
  savePublicProfile = jest.fn();
  followUser = jest.fn();
  unfollowUser = jest.fn();
}

jest.mock('@capacitor-firebase/firestore');

describe('ProfileDataAccessService', () => {
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileDataAccessService,
        { provide: BiteTribeStoreService, useClass: Mock },
        provideMockStore(),
      ],
    }).compileComponents();

    storeService = TestBed.inject(BiteTribeStoreService);
  });

  it('should create the service', inject(
    [ProfileDataAccessService],
    (service: ProfileDataAccessService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('logout', () => {
    it('should call logout on BiteTribeStoreService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const logoutSpy = jest.spyOn(storeService, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitLikeClick', () => {
    it('should call submitLikeClick on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const submitLikeClickSpy = jest.spyOn(storeService, 'submitLikeClick');
        service.submitLikeClick({ likeType: 'like', biteId: 'bite-id' });
        expect(submitLikeClickSpy).toHaveBeenCalledWith({
          likeType: 'like',
          biteId: 'bite-id',
        });
      },
    ));

    describe('with an already liked bite', () => {
      let removeLikeSpy: SpyInstance;

      beforeEach(() => {
        removeLikeSpy = jest.spyOn(storeService, 'removeLike');
        storeService.bites$ = of([
          {
            id: 'bite-id',
            likes: [{ userId: 'user-id', likeType: 'like' }],
          } as any,
        ]);
      });

      it('should removeLike', inject(
        [ProfileDataAccessService],
        (service: ProfileDataAccessService) => {
          service.submitLikeClick({ likeType: 'like', biteId: 'bite-id' });
          expect(removeLikeSpy).toHaveBeenCalledWith({
            likeType: 'like',
            biteId: 'bite-id',
          });
        },
      ));
    });
  });

  describe('savePublicProfile', () => {
    it('should call savePublicProfile on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const savePublicProfileSpy = jest.spyOn(
          storeService,
          'savePublicProfile',
        );
        const mockUser = { id: 'user-id', name: 'Test User' } as any;
        service.savePublicProfile(mockUser);
        expect(savePublicProfileSpy).toHaveBeenCalledWith(mockUser);
      },
    ));
  });

  describe('submitFollowClick', () => {
    it('should call followUser on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const followUserSpy = jest.spyOn(storeService, 'followUser');
        const mockUser = { id: 'user-id', name: 'Test User' } as any;
        service.submitFollowClick(mockUser);
        expect(followUserSpy).toHaveBeenCalledWith(mockUser);
      },
    ));
  });

  describe('submitUnfollowClick', () => {
    it('should call unfollowUser on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const unfollowUserSpy = jest.spyOn(storeService, 'unfollowUser');
        const mockUser = { id: 'user-id', name: 'Test User' } as any;
        service.submitUnfollowClick(mockUser);
        expect(unfollowUserSpy).toHaveBeenCalledWith(mockUser);
      },
    ));
  });

  describe('userLoader', () => {
    let getDocumentSpy: SpyInstance;

    beforeEach(() => {
      getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({ snapshot: { data: {} } } as any);
    });

    describe('given a user id', () => {
      it('should load user data from FirebaseFirestore', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          await service.userLoader({
            params: { userId: 'user-id' },
          } as any);

          expect(getDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/user-id',
          });
        },
      ));
    });

    describe('given no user id', () => {
      it('should return an empty object', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          const result = await service.userLoader({
            params: { userId: '' },
          } as any);

          expect(result).toEqual({});
        },
      ));
    });

    describe('given no snapshot is returned', () => {
      it('should return an empty object', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          getDocumentSpy.mockResolvedValue({ snapshot: null } as any);

          const result = await service.userLoader({
            params: { userId: 'user-id' },
          } as any);

          expect(result).toEqual({});
        },
      ));
    });

    describe('given a snapshot without data is returned', () => {
      it('should return an empty object', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          getDocumentSpy.mockResolvedValue({ snapshot: { data: null } } as any);

          const result = await service.userLoader({
            params: { userId: 'user-id' },
          } as any);

          expect(result).toEqual({});
        },
      ));
    });
  });
});

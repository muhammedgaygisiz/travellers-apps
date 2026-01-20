import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { ProfileDataAccessService } from '../profile-data-access.service';
import SpyInstance = jest.SpyInstance;

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
  logout = (): null => null;
  removeLike = (): null => null;
  submitLikeClick = (): null => null;
  submitFollowClick = (): null => null;
  savePublicProfile = (): null => null;
  followUser = (): null => null;
}

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
});

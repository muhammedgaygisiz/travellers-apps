import { inject, TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { ProfileDataAccessService } from '../profile-data-access.service';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { LikeClick, PublicUser } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { ProfilePhotoUploadService } from '../profile-photo-upload.service';

const photoUploadMock = { start: jest.fn(), retry: jest.fn() };

class Mock {
  isAuthenticated$ = of(true);
  bitesByUser$ = of([]);
  publicUser$ = of({
    userId: 'user-id',
    photoUrl: 'current-url',
  } as PublicUser);
  bites$ = of([]);
  userId$ = of('user-id');
  isPublicProfile$ = of(true);
  profileMetadata$ = of(true);
  blockedUserIds$ = of([]);
  myProfileBites$ = of(null);
  user = jest.fn();
  userIdFromUrl = jest.fn();
  logout = jest.fn();
  submitLikeClick = jest.fn();
  notifySavedProfile = jest.fn();
  followUser = jest.fn();
  unfollowUser = jest.fn();
  blockUser = jest.fn();
  unblockUser = jest.fn();
}

const ApiMock = {
  saveProfile: jest.fn(),
  bitesByUser: jest.fn(),
  claimDisplayName: jest.fn(),
  reportUser: jest.fn(),
};

const MOCK_PUBLIC_USER: PublicUser = {
  userId: 'user-id',
  displayName: 'Test User',
  email: 'test@example.com',
  photoUrl: '',
};

type LoaderParams = Parameters<ProfileDataAccessService['userLoader']>[0];
type CollectionResult = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;
type DocumentResult = Awaited<ReturnType<typeof FirebaseFirestore.getDocument>>;

const createLoaderParams = (userId: string): LoaderParams => ({
  params: { userId },
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' },
});

const createCollectionResult = (snapshots: unknown[]): CollectionResult =>
  ({ snapshots }) as unknown as CollectionResult;

const createDocumentResult = (snapshot: unknown): DocumentResult =>
  ({ snapshot }) as unknown as DocumentResult;

jest.mock('@capacitor-firebase/firestore');

describe('ProfileDataAccessService', () => {
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileDataAccessService,
        { provide: BiteTribeStoreService, useClass: Mock },
        { provide: BiteTribeApiService, useValue: ApiMock },
        { provide: ProfilePhotoUploadService, useValue: photoUploadMock },
        provideMockStore(),
      ],
    }).compileComponents();

    jest.clearAllMocks();
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
    it('should forward the like click to BiteTribeStoreService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const submitLikeClickSpy = jest.spyOn(storeService, 'submitLikeClick');
        const likeClick: LikeClick = {
          likeType: 'thumbup',
          biteId: 'bite-id',
          action: 'save',
        };

        service.submitLikeClick(likeClick);

        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeClick);
      },
    ));
  });

  describe('savePublicProfile', () => {
    it('writes the profile and syncs the store', inject(
      [ProfileDataAccessService],
      async (service: ProfileDataAccessService) => {
        const saved = { ...MOCK_PUBLIC_USER, city: 'Munich' };
        ApiMock.saveProfile.mockResolvedValue(saved);

        await service.savePublicProfile(MOCK_PUBLIC_USER);

        expect(ApiMock.saveProfile).toHaveBeenCalledWith(MOCK_PUBLIC_USER);
        expect(storeService.notifySavedProfile).toHaveBeenCalledWith(saved);
        expect(photoUploadMock.start).not.toHaveBeenCalled();
      },
    ));

    /** GitHub issue #1953. */
    it('marks a new photo pending, keeps the current one and uploads in the background', inject(
      [ProfileDataAccessService],
      async (service: ProfileDataAccessService) => {
        const photo = 'data:image/jpeg;base64,AAAA';
        const saved = { ...MOCK_PUBLIC_USER, photoStatus: 'pending' as const };
        ApiMock.saveProfile.mockResolvedValue(saved);

        await service.savePublicProfile({
          ...MOCK_PUBLIC_USER,
          photoUrl: photo,
        });

        expect(ApiMock.saveProfile).toHaveBeenCalledWith(
          { ...MOCK_PUBLIC_USER, photoUrl: 'current-url' },
          expect.any(Number),
        );
        expect(storeService.notifySavedProfile).toHaveBeenCalledWith(saved);
        expect(photoUploadMock.start).toHaveBeenCalledWith(saved, photo);
      },
    ));

    it('lets a failed write through and uploads nothing', inject(
      [ProfileDataAccessService],
      async (service: ProfileDataAccessService) => {
        ApiMock.saveProfile.mockRejectedValue(new Error('denied'));

        await expect(
          service.savePublicProfile({
            ...MOCK_PUBLIC_USER,
            photoUrl: 'data:image/jpeg;base64,AAAA',
          }),
        ).rejects.toThrow('denied');
        expect(photoUploadMock.start).not.toHaveBeenCalled();
      },
    ));
  });

  describe('claimDisplayName', () => {
    it('should call claimDisplayName on BiteTribeApiService', inject(
      [ProfileDataAccessService],
      async (service: ProfileDataAccessService) => {
        ApiMock.claimDisplayName.mockResolvedValue({
          displayName: 'Test User',
          normalizedDisplayName: 'testuser',
        });

        await expect(service.claimDisplayName('Test User')).resolves.toEqual({
          displayName: 'Test User',
          normalizedDisplayName: 'testuser',
        });
        expect(ApiMock.claimDisplayName).toHaveBeenCalledWith('Test User');
      },
    ));
  });

  describe('submitFollowClick', () => {
    it('should call followUser on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const followUserSpy = jest.spyOn(storeService, 'followUser');
        const mockUser = MOCK_PUBLIC_USER;
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
        const mockUser = MOCK_PUBLIC_USER;
        service.submitUnfollowClick(mockUser);
        expect(unfollowUserSpy).toHaveBeenCalledWith(mockUser);
      },
    ));
  });

  describe('submitBlockClick', () => {
    it('should call blockUser on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const blockUserSpy = jest.spyOn(storeService, 'blockUser');
        service.submitBlockClick(MOCK_PUBLIC_USER);
        expect(blockUserSpy).toHaveBeenCalledWith(MOCK_PUBLIC_USER);
      },
    ));
  });

  describe('reportUser', () => {
    it('should report the profile through BiteTribeApiService', inject(
      [ProfileDataAccessService],
      async (service: ProfileDataAccessService) => {
        ApiMock.reportUser.mockResolvedValue({ reported: true });

        await expect(
          service.reportUser('user-id', 'harassment'),
        ).resolves.toEqual({ reported: true });
        expect(ApiMock.reportUser).toHaveBeenCalledWith(
          'user-id',
          'harassment',
        );
      },
    ));
  });

  describe('submitUnblockClick', () => {
    it('should call unblockUser on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const unblockUserSpy = jest.spyOn(storeService, 'unblockUser');
        service.submitUnblockClick(MOCK_PUBLIC_USER);
        expect(unblockUserSpy).toHaveBeenCalledWith(MOCK_PUBLIC_USER);
      },
    ));
  });

  describe('isBlockedByMe', () => {
    it('is false while no profile is loaded', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        expect(service.isBlockedByMe()).toBe(false);
      },
    ));

    it('is true for a loaded profile the signed-in user blocked', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const writable = service as unknown as {
          userValue: () => PublicUser | undefined;
          blockedUserIds: () => string[];
        };
        writable.userValue = (): PublicUser => MOCK_PUBLIC_USER;
        writable.blockedUserIds = (): string[] => [MOCK_PUBLIC_USER.userId];

        expect(service.isBlockedByMe()).toBe(true);
      },
    ));
  });

  describe('loadBitesByUser', () => {
    it("reads the user's Bites through BiteTribeApiService", inject(
      [ProfileDataAccessService],
      async (service: ProfileDataAccessService) => {
        ApiMock.bitesByUser.mockResolvedValue([]);

        await expect(service.loadBitesByUser('user-id')).resolves.toEqual([]);
        expect(ApiMock.bitesByUser).toHaveBeenCalledWith('user-id');
      },
    ));
  });

  describe('userLoader', () => {
    let getDocumentSpy: jest.SpiedFunction<
      typeof FirebaseFirestore.getDocument
    >;

    beforeEach(() => {
      getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(createDocumentResult({ data: {} }));
    });

    describe('given a user id', () => {
      it('should load user data from FirebaseFirestore', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          await service.userLoader(createLoaderParams('user-id'));

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
          const result = await service.userLoader(createLoaderParams(''));

          expect(result).toBeUndefined();
        },
      ));
    });

    describe('given no snapshot is returned', () => {
      it('should return an empty object', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          getDocumentSpy.mockResolvedValue(createDocumentResult(null));

          const result = await service.userLoader(
            createLoaderParams('user-id'),
          );

          expect(result).toBeUndefined();
        },
      ));
    });

    describe('given the rules refuse a private profile (issue #1863)', () => {
      it('should return a stand-in holding the uid alone', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          getDocumentSpy.mockRejectedValue(
            new Error('Missing or insufficient permissions.'),
          );

          const result = await service.userLoader(
            createLoaderParams('user-id'),
          );

          expect(result).toEqual({
            userId: 'user-id',
            public: false,
            displayName: '',
            email: '',
            photoUrl: '',
          });
        },
      ));
    });

    describe('given a snapshot without data is returned', () => {
      it('should return an empty object', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          getDocumentSpy.mockResolvedValue(
            createDocumentResult({ data: null }),
          );

          const result = await service.userLoader(
            createLoaderParams('user-id'),
          );

          expect(result).toBeUndefined();
        },
      ));
    });
  });
});

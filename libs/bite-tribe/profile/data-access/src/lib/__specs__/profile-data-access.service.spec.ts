import { inject, TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { ProfileDataAccessService } from '../profile-data-access.service';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { LikeClick, PublicUser } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

class Mock {
  isAuthenticated$ = of(true);
  bitesByUser$ = of([]);
  publicUser$ = of(null);
  bites$ = of([]);
  userId$ = of('user-id');
  isPublicProfile$ = of(true);
  profileMetadata$ = of(true);
  sortedMyBites$ = of(null);
  user = jest.fn();
  userIdFromUrl = jest.fn();
  logout = jest.fn();
  submitLikeClick = jest.fn();
  savePublicProfile = jest.fn();
  followUser = jest.fn();
  unfollowUser = jest.fn();
}

const ApiMock = {
  claimDisplayName: jest.fn(),
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

  describe('biteTrailLoader', () => {
    let getCollectionSpy: jest.SpiedFunction<
      typeof FirebaseFirestore.getCollection
    >;

    beforeEach(() => {
      getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(createCollectionResult([]));
    });

    describe('given no bite trails', () => {
      it('should load bite trail data from FirebaseFirestore', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          await service.biteTrailLoader(createLoaderParams('user-id'));

          expect(getCollectionSpy).toHaveBeenCalledWith({
            reference: 'biteTrails',
            compositeFilter: {
              type: 'and',
              queryConstraints: [
                {
                  type: 'where',
                  fieldPath: 'ownerId',
                  opStr: '==',
                  value: 'user-id',
                },
              ],
            },
          });
        },
      ));
    });

    describe('given bite trails', () => {
      it('should return bite trails in the correct format', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          getCollectionSpy.mockResolvedValue(
            createCollectionResult([
              {
                id: 'bite-trail-id',
                data: { name: 'Bite Trail 1' },
              },
            ]),
          );

          const result = await service.biteTrailLoader(
            createLoaderParams('user-id'),
          );

          expect(result).toEqual([
            { id: 'bite-trail-id', name: 'Bite Trail 1' },
          ]);
        },
      ));
    });

    describe('given no user id', () => {
      it('should return an empty array', inject(
        [ProfileDataAccessService],
        async (service: ProfileDataAccessService) => {
          const result = await service.biteTrailLoader(createLoaderParams(''));

          expect(result).toEqual([]);
        },
      ));
    });
  });

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
    it('should call savePublicProfile on storeService', inject(
      [ProfileDataAccessService],
      (service: ProfileDataAccessService) => {
        const savePublicProfileSpy = jest.spyOn(
          storeService,
          'savePublicProfile',
        );
        const mockUser = MOCK_PUBLIC_USER;
        service.savePublicProfile(mockUser);
        expect(savePublicProfileSpy).toHaveBeenCalledWith(mockUser);
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

  describe('myBiteTrails', () => {
    let getCollectionSpy: jest.SpiedFunction<
      typeof FirebaseFirestore.getCollection
    >;

    const settle = async (service: ProfileDataAccessService): Promise<void> => {
      for (let i = 0; i < 5 && service.myBiteTrails.isLoading(); i++) {
        await TestBed.inject(ApplicationRef).whenStable();
      }
    };

    beforeEach(async () => {
      getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(createCollectionResult([]));

      await TestBed.inject(ApplicationRef).whenStable();
      getCollectionSpy.mockClear();
    });

    describe('given a logged in user', () => {
      it('should request bite trails using the uid of the store user', async () => {
        const service = TestBed.inject(ProfileDataAccessService);
        jest.spyOn(storeService, 'user').mockReturnValue({
          uid: 'store-user-id',
        } as unknown as ReturnType<BiteTribeStoreService['user']>);

        service.myBiteTrails.value();
        await settle(service);

        expect(getCollectionSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            compositeFilter: expect.objectContaining({
              queryConstraints: [
                expect.objectContaining({ value: 'store-user-id' }),
              ],
            }),
          }),
        );
      });
    });

    describe('given no logged in user', () => {
      it('should not request bite trails', async () => {
        const service = TestBed.inject(ProfileDataAccessService);
        jest.spyOn(storeService, 'user').mockReturnValue(undefined);

        service.myBiteTrails.value();
        await settle(service);

        expect(getCollectionSpy).not.toHaveBeenCalled();
      });
    });
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

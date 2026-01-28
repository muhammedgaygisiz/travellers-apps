import { ProfileApiService } from '../profile-api.service';
import { AuthService } from 'ta-firestore';
import { inject, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { PublicUser } from 'model';
import { TestScheduler } from 'rxjs/testing';
import { ErrorHandler } from '@angular/core';
import { getDownloadUrlFromFirebaseStorage, isBase64String } from 'utils';
import { deleteCurrentImage } from '../utils/delete-current-image';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    setDocument: jest.fn(),
    updateDocument: jest.fn(),
    getDocument: jest.fn(),
    getCountFromServer: jest.fn(),
    deleteDocument: jest.fn(),
    getCollection: jest.fn(),
  },
}));

jest.mock('utils', () => ({
  isBase64String: jest.fn(),
  getDownloadUrlFromFirebaseStorage: jest.fn(),
}));

jest.mock('../utils/delete-current-image', () => ({
  deleteCurrentImage: jest.fn(),
}));

jest.mock('../utils/upload-base64-to-firebase-storage', () => ({
  uploadBase64ToFirebaseStorage: jest.fn(),
}));

const MockedAuthService = {
  authState: (): any => ({
    user: {
      uid: '123',
      providerData: [{ photoUrl: 'photo-url' }],
    },
  }),
  isLoggedIn$: of(true),
};

const MockedErrorHandler = {
  handleError: jest.fn(),
};

describe(ProfileApiService.name, () => {
  let scheduler: TestScheduler;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: ErrorHandler, useValue: MockedErrorHandler },
      ],
    });
  });

  it('should create', inject(
    [ProfileApiService],
    (service: ProfileApiService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('given no login', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      TestBed.overrideProvider(AuthService, {
        useValue: { ...MockedAuthService, isLoggedIn: false },
      });
    });

    it('should skip execution', inject(
      [ProfileApiService],
      (service: ProfileApiService) => {
        nextSpy = jest
          .spyOn((service as any).profileChannel$, 'next')
          .mockImplementation();

        scheduler.run(({ cold, expectObservable }) => {
          const expected = '';

          expectObservable(service.publicProfile$).toBe(expected);
        });

        expect(nextSpy).not.toHaveBeenCalled();
      },
    ));
  });

  describe('startListener', () => {
    let addCollectionSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addCollectionSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockResolvedValue('mocked-callback-id');
    });

    it('should start the listener', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        await service.startListener();

        expect(addCollectionSnapshotListenerSpy).toHaveBeenCalled();
      },
    ));

    describe('given passed callback of listener', () => {
      it('should handle response when listener callback is invoked', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          await service.startListener();
          const mockDoc = {
            snapshots: [
              {
                data: {
                  userId: '123',
                  name: 'Test User',
                },
              },
            ],
          };

          const callback = addCollectionSnapshotListenerSpy.mock.calls[0][1];

          callback(mockDoc);
        },
      ));
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    it('should handle the response and update profile channel', inject(
      [ProfileApiService],
      (service: ProfileApiService) => {
        nextSpy = jest
          .spyOn((service as any).profileChannel$, 'next')
          .mockImplementation();

        const mockDoc = {
          snapshots: [
            {
              data: {
                userId: '123',
                name: 'Test User',
              },
            },
          ],
        };

        service.handleResponse(mockDoc);

        expect(nextSpy).toHaveBeenCalledWith({
          userId: '123',
          name: 'Test User',
        });
      },
    ));
  });

  describe('stopProfileListener', () => {
    it('should call stopped$.next and removeSnapshotListener', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const removeSnapshotListenerSpy = jest
          .spyOn(FirebaseFirestore, 'removeSnapshotListener')
          .mockResolvedValue();

        const callbackId = 'test-callback-id';

        await service.stopProfileListener(callbackId);

        expect(removeSnapshotListenerSpy).toHaveBeenCalledWith({
          callbackId,
        });
      },
    ));
  });

  describe('saveUser', () => {
    it('should call FirebaseFirestore.setDocument', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const setDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'setDocument')
          .mockResolvedValue();

        await service.saveUser(true);

        expect(setDocumentSpy).toHaveBeenCalledWith({
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            displayName: '',
            email: '',
            photoUrl: 'photo-url',
            public: true,
            userId: '123',
          },
          reference: 'users/123',
        });
      },
    ));

    describe('given an error', () => {
      it('should handle the error', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(FirebaseFirestore, 'setDocument')
            .mockRejectedValue(new Error('Failed to save user'));

          try {
            await service.saveUser(true);
          } catch (error) {
            // Expected to throw
          }

          expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(
            expect.any(Error),
          );
        },
      ));
    });
  });

  describe('updateUser', () => {
    describe('given a user without base64 as photoUrl', () => {
      it('should call FirebaseFirestore.updateDocument', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const updateDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'updateDocument')
            .mockResolvedValue();

          const publicUser = {
            userId: '123',
            name: 'Updated User',
          } as unknown as PublicUser;

          await service.updateUser(publicUser);

          expect(updateDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/123',
            data: {
              about: '',
              city: '',
              displayName: undefined,
              email: undefined,
              photoUrl: undefined,
              public: false,
              updatedAt: '2024-03-15T12:00:00.000Z',
              updatedAtTimestamp: 1710504000000,
            },
          });
        },
      ));
    });

    describe('given a user with base64 string as photoUrl', () => {
      beforeEach(() => {
        (isBase64String as jest.Mock).mockReturnValue(true);
        (deleteCurrentImage as jest.Mock).mockImplementation();
        (uploadBase64ToFirebaseStorage as jest.Mock).mockResolvedValue(
          Promise.resolve('new-photo-url'),
        );
        (getDownloadUrlFromFirebaseStorage as jest.Mock).mockReturnValue(
          'download-url',
        );
        jest
          .spyOn(FirebaseFirestore, 'updateDocument')
          .mockResolvedValue(Promise.resolve());
      });

      it('should delete current image, upload base64 image and update the user', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const publicUser = {
            userId: '123',
            name: 'Updated User',
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          } as unknown as PublicUser;

          await service.updateUser(publicUser);

          expect(deleteCurrentImage).toHaveBeenCalledWith({
            name: 'Updated User',
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            userId: '123',
          });
          expect(getDownloadUrlFromFirebaseStorage).toHaveBeenCalledWith(
            'new-photo-url',
          );
          expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith(
            true,
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            '123',
            'users',
          );
          expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
            reference: 'users/123',
            data: {
              about: '',
              city: '',
              displayName: undefined,
              email: undefined,
              name: 'Updated User',
              photoUrl: 'download-url',
              public: false,
              updatedAt: '2024-03-15T12:00:00.000Z',
              updatedAtTimestamp: 1710504000000,
              userId: '123',
            },
          });
        },
      ));
    });

    describe('given an error', () => {
      it('should handle the error and return undefined', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(FirebaseFirestore, 'updateDocument')
            .mockRejectedValue(new Error('Failed to update user'));

          const publicUser = {
            userId: '123',
            name: 'Updated User',
          } as unknown as PublicUser;

          const result = await service.updateUser(publicUser);

          expect(result).toBeUndefined();
        },
      ));
    });
  });

  describe('getUserByBiteId', () => {
    describe('given no bite', () => {
      it('should return empty observable', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const result = await service.getUserByBiteId(undefined);

          expect(result).toBeUndefined();
        },
      ));
    });

    describe('given a bite', () => {
      it('should call FirebaseFirestore.getDocument', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const mockedData = {
            snapshot: {
              id: 'bite-user-id',
              data: {
                name: 'Bite User',
              },
            },
          } as any;

          const getDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockResolvedValue(mockedData);

          const setDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'setDocument')
            .mockResolvedValue(mockedData);

          const bite = { userId: 'bite-user-id' } as any;

          const result = await service.getUserByBiteId(bite);

          expect(getDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/bite-user-id',
          });
          expect(setDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/bite-user-id',
            data: {
              userId: 'bite-user-id',
              name: 'Bite User',
            },
          });
          expect(result).toEqual({
            userId: 'bite-user-id',
            name: 'Bite User',
          });
        },
      ));
    });

    describe('given an error', () => {
      beforeEach(() => {
        jest.resetAllMocks();
      });

      it('should handle the error and throw', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockRejectedValue(new Error('Failed to fetch user'));

          const bite = { userId: 'bite-user-id' } as any;

          const result = await service.getUserByBiteId(bite);

          expect(result).toBeUndefined();
        },
      ));
    });
  });

  describe('getUserById', () => {
    describe('given no biteCreatorId', () => {
      it('should return undefined', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const result = await service.getUserById('');

          expect(result).toBeUndefined();
        },
      ));
    });

    describe('given a biteCreatorId', () => {
      it('should call FirebaseFirestore.getDocument and return the user data', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const mockedData = {
            snapshot: {
              id: 'user-id-123',
              data: {
                name: 'Test User',
              },
            },
          } as any;

          const getDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockResolvedValue(mockedData);

          const result = await service.getUserById('user-id-123');

          expect(getDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/user-id-123',
          });
          expect(result).toEqual({
            userId: 'user-id-123',
            name: 'Test User',
          });
        },
      ));
    });

    describe('given an error', () => {
      it('should handle the error and return undefined', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockRejectedValue(new Error('Failed to fetch user'));

          const result = await service.getUserById('user-id-123');

          expect(result).toBeUndefined();
        },
      ));
    });
  });

  describe('saveUserIfNotExisting', () => {
    let getDocumentSpy: jest.SpyInstance;
    let setUserPublicFlagSpy: jest.SpyInstance;

    describe('given not existing user', () => {
      it('should save user if not existing', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          setUserPublicFlagSpy = jest
            .spyOn(service, 'setUserPublicFlag')
            .mockResolvedValue();

          getDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockResolvedValue({
              snapshot: {
                data: null,
              },
            } as any);

          const setDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'setDocument')
            .mockResolvedValue();

          await service.saveUserIfNotExisting();

          expect(getDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/123',
          });
          expect(setDocumentSpy).toHaveBeenCalledWith({
            data: {
              createdAt: '2024-03-15T12:00:00.000Z',
              createdAtTimestamp: 1710504000000,
              displayName: '',
              email: '',
              photoUrl: 'photo-url',
              public: false,
              userId: '123',
            },
            reference: 'users/123',
          });
        },
      ));
    });

    describe('given existing user without public flag', () => {
      it('should not save user but call setUserPublicFlag with uid', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          setUserPublicFlagSpy = jest
            .spyOn(service, 'setUserPublicFlag')
            .mockResolvedValue();

          getDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockResolvedValue({
              snapshot: {
                data: {
                  userId: '123',
                  name: 'Existing User',
                },
              },
            } as any);

          jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

          await service.saveUserIfNotExisting();

          expect(getDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/123',
          });

          expect(setUserPublicFlagSpy).toHaveBeenCalledWith('123');
        },
      ));
    });
  });

  describe('setUserPublicFlag', () => {
    const updateDocumentSpy = jest
      .spyOn(FirebaseFirestore, 'updateDocument')
      .mockResolvedValue();

    describe('given no uid', () => {
      it('should not call updateDocument', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          await service.setUserPublicFlag('');

          expect(updateDocumentSpy).not.toHaveBeenCalled();
        },
      ));
    });

    describe('given a uid', () => {
      it('should call updateDocument with public true', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          await service.setUserPublicFlag('123');

          expect(updateDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/123',
            data: {
              public: true,
              updatedAt: '2024-03-15T12:00:00.000Z',
              updatedAtTimestamp: 1710504000000,
            },
          });
        },
      ));

      describe('and an error', () => {
        it('handle the error', inject(
          [ProfileApiService],
          async (service: ProfileApiService) => {
            const consoleErrorSpy = jest
              .spyOn(console, 'error')
              .mockImplementation();

            updateDocumentSpy.mockRejectedValueOnce(
              new Error('Failed to update user'),
            );

            try {
              await service.setUserPublicFlag('123');
            } catch (error) {
              // Error is handled inside the method
            }

            expect(consoleErrorSpy).toHaveBeenCalledWith(
              'Error updating public user:',
              expect.any(Error),
            );
          },
        ));
      });
    });
  });

  describe('followUser', () => {
    it('should build followRelationship and call FirebaseFirestore.setDocument for both users', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const setDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'setDocument')
          .mockResolvedValue();

        const publicUser = {
          userId: 'followed-user-id',
        } as unknown as PublicUser;

        await service.followUser(publicUser);

        expect(setDocumentSpy).toHaveBeenCalledWith({
          reference: 'users/followed-user-id/followers/123',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            followerUid: '123',
            followedUid: 'followed-user-id',
          },
        });

        expect(setDocumentSpy).toHaveBeenCalledWith({
          reference: 'users/123/following/followed-user-id',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            followerUid: '123',
            followedUid: 'followed-user-id',
          },
        });
      },
    ));

    describe('given current user is undefined', () => {
      beforeEach(() => {
        TestBed.overrideProvider(AuthService, {
          useValue: {
            ...MockedAuthService,
            authState: (): any => ({ user: undefined }),
          },
        });
      });

      it('should handle the error', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          const publicUser = {
            userId: 'followed-user-id',
          } as unknown as PublicUser;

          try {
            await service.followUser(publicUser);
          } catch (error) {
            // Expected to throw
          }

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error following user:',
            expect.any(Error),
          );
        },
      ));
    });
  });

  describe('getTotalNumberOfUsers', () => {
    it('should call FirebaseFirestore.getCountFromServer and return the count', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const getCountFromServerSpy = jest
          .spyOn(FirebaseFirestore, 'getCountFromServer')
          .mockResolvedValue({ count: 42 } as any);

        const result = await service.getTotalNumberOfUsers();

        expect(getCountFromServerSpy).toHaveBeenCalledWith({
          reference: 'users',
        });
        expect(result).toBe(42);
      },
    ));
  });

  describe('unfollowUser', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('given current user is defined', () => {
      beforeEach(() => {
        TestBed.overrideProvider(AuthService, {
          useValue: MockedAuthService,
        });
      });

      it('should call delete followers and following entries', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const deleteDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'deleteDocument')
            .mockResolvedValue();

          const publicUser = {
            userId: 'unfollowed-user-id',
          } as unknown as PublicUser;

          await service.unfollowUser(publicUser);

          expect(deleteDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/unfollowed-user-id/followers/123',
          });

          expect(deleteDocumentSpy).toHaveBeenCalledWith({
            reference: 'users/123/following/unfollowed-user-id',
          });
        },
      ));
    });

    describe('given current user is undefined', () => {
      it('should handle the error', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(MockedAuthService, 'authState')
            .mockReturnValue(Promise.resolve({ user: undefined }));

          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          const publicUser = {
            userId: 'unfollowed-user-id',
          } as unknown as PublicUser;

          try {
            await service.unfollowUser(publicUser);
          } catch (error) {
            // Expected to throw
          }

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error unfollowing user:',
            expect.any(Error),
          );
        },
      ));
    });
  });

  describe('fetchFollowers', () => {
    it('should load followers subcollection', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const mockedSnapshots = [
          { id: 'follower1', data: (): any => ({}) },
          { id: 'follower2', data: (): any => ({}) },
        ];

        const getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({ snapshots: mockedSnapshots } as any);

        const result = await service.fetchFollowers('user-id-123');

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'users/user-id-123/followers',
        });
        expect(result).toEqual(mockedSnapshots);
      },
    ));

    describe('given an error', () => {
      it('should handle the error and return empty array', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          jest
            .spyOn(FirebaseFirestore, 'getCollection')
            .mockRejectedValue(new Error('Failed to fetch followers'));

          const result = await service.fetchFollowers('user-id-123');

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error fetching followers:',
            expect.any(Error),
          );
          expect(result).toEqual([]);
        },
      ));
    });
  });

  describe('fetchFollowing', () => {
    it('should load following subcollection', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const mockedSnapshots = [
          { id: 'following1', data: (): any => ({}) },
          { id: 'following2', data: (): any => ({}) },
        ];

        const getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({ snapshots: mockedSnapshots } as any);

        const result = await service.fetchFollowing('user-id-123');

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'users/user-id-123/following',
        });
        expect(result).toEqual(mockedSnapshots);
      },
    ));

    describe('given an error', () => {
      it('should handle the error and return empty array', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          jest
            .spyOn(FirebaseFirestore, 'getCollection')
            .mockRejectedValue(new Error('Failed to fetch following'));

          const result = await service.fetchFollowing('user-id-123');

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error fetching following:',
            expect.any(Error),
          );
          expect(result).toEqual([]);
        },
      ));
    });
  });

  describe('isCurrentUserFollowing', () => {
    describe('given current user is in followers list', () => {
      beforeEach(() => {
        TestBed.overrideProvider(AuthService, {
          useValue: {
            ...MockedAuthService,
            authState: (): any => ({ user: { uid: 'current-user-id' } }),
          },
        });
      });

      it('should return true', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const followers = [
            { id: 'follower1' },
            { id: 'current-user-id' },
            { id: 'follower3' },
          ] as any;

          const result = await service.isCurrentUserFollowing(followers);

          expect(result).toBe(true);
        },
      ));
    });

    describe('given current user is not in followers list', () => {
      it('should return false', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(MockedAuthService, 'authState')
            .mockReturnValue(
              Promise.resolve({ user: { uid: 'current-user-id' } }),
            );

          const followers = [
            { id: 'follower1' },
            { id: 'follower2' },
            { id: 'follower3' },
          ] as any;

          const result = await service.isCurrentUserFollowing(followers);

          expect(result).toBe(false);
        },
      ));
    });

    describe('given current user is undefined', () => {
      beforeEach(() => {
        TestBed.overrideProvider(AuthService, {
          useValue: {
            ...MockedAuthService,
            authState: (): any => ({ user: undefined }),
          },
        });
      });

      it('should return false if current user is undefined', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          jest
            .spyOn(MockedAuthService, 'authState')
            .mockReturnValue(Promise.resolve({ user: undefined }));

          const followers = [
            { id: 'follower1' },
            { id: 'follower2' },
            { id: 'follower3' },
          ] as any;

          const result = await service.isCurrentUserFollowing(followers);

          expect(result).toBe(false);
        },
      ));
    });
  });

  describe('fetchFollowersWithDetails', () => {
    it('should fetch followers and their user details', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const mockedFollowers = [
          { id: 'follower1', name: 'User follower1' },
          { id: 'follower2', name: 'User follower2' },
        ] as any;

        const fetchFollowersSpy = jest
          .spyOn(service, 'fetchFollowers')
          .mockResolvedValue(mockedFollowers);

        const getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockImplementation(({ reference }) => {
            const userId = reference.split('/')[1];
            return Promise.resolve({
              snapshot: {
                id: userId,
                data: { ...mockedFollowers.find((f: any) => f.id === userId) },
              },
            } as any);
          });

        const result = await service.fetchFollowersWithDetails('user-id-123');

        expect(fetchFollowersSpy).toHaveBeenCalledWith('user-id-123');
        expect(getDocumentSpy).toHaveBeenCalledTimes(2);
        expect(result).toEqual([
          { id: 'follower1', name: 'User follower1' },
          { id: 'follower2', name: 'User follower2' },
        ]);
      },
    ));
  });

  describe('fetchFollowingWithDetails', () => {
    it('should fetch following and their user details', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const mockedFollowing = [
          { data: { followedUid: 'following1', name: 'User following1' } },
          { data: { followedUid: 'following2', name: 'User following2' } },
        ] as any;

        const fetchFollowingSpy = jest
          .spyOn(service, 'fetchFollowing')
          .mockResolvedValue(mockedFollowing);

        const getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockImplementation(({ reference }) => {
            const userId = reference.split('/')[1];
            const { followedUid, ...rest } = mockedFollowing.find(
              (f: any) => f.data.followedUid === userId,
            ).data;
            return Promise.resolve({
              snapshot: {
                id: userId,
                data: {
                  ...rest,
                  id: followedUid,
                },
              },
            } as any);
          });

        const result = await service.fetchFollowingWithDetails('user-id-123');

        expect(fetchFollowingSpy).toHaveBeenCalledWith('user-id-123');
        expect(getDocumentSpy).toHaveBeenCalledTimes(2);
        expect(result).toEqual([
          { id: 'following1', name: 'User following1' },
          { id: 'following2', name: 'User following2' },
        ]);
      },
    ));
  });
});

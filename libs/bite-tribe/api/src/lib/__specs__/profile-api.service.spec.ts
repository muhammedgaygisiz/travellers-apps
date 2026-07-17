import { ProfileApiService } from '../profile-api.service';
import { AuthService } from 'ta-firestore';
import {
  markUserMetadataUpdated,
  shouldUpdateUserMetadata,
} from '../utils/user-metadata-throttle';
import { inject, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { PublicUser } from 'model';
import { TestScheduler } from 'rxjs/testing';
import { ErrorHandler } from '@angular/core';
import { getDownloadUrlFromFirebaseStorage, isBase64String } from 'utils';
import { deleteCurrentImage } from '../utils/delete-current-image';
import { uploadBase64ToFirebaseStorage } from '../utils/upload-base64-to-firebase-storage';
import { updateProfileWithImagePathFromFirebaseStorage } from '../bite-api/utils/update-profile-with-image-path-from-firestorage';
import { loadProfileById } from '../bite-api/utils/load-profile-by-id';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
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

jest.mock(
  '../bite-api/utils/update-profile-with-image-path-from-firestorage',
  () => ({
    updateProfileWithImagePathFromFirebaseStorage: jest.fn(),
  }),
);

jest.mock('../bite-api/utils/load-profile-by-id', () => ({
  loadProfileById: jest.fn(),
}));

jest.mock('../utils/user-metadata-throttle', () => ({
  shouldUpdateUserMetadata: jest.fn().mockResolvedValue(true),
  markUserMetadataUpdated: jest.fn().mockResolvedValue(undefined),
}));

const MockedAuthService = {
  getUser: (): any => ({
    uid: '123',
    providerData: [{ photoUrl: 'photo-url' }],
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
            fullName: '',
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
              fullName: '',
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
          expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith({
            base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            docId: '123',
            collection: 'users',
          });
          expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
            reference: 'users/123',
            data: {
              about: '',
              city: '',
              displayName: undefined,
              fullName: '',
              email: undefined,
              photoUrl: 'download-url',
              public: false,
              updatedAt: '2024-03-15T12:00:00.000Z',
              updatedAtTimestamp: 1710504000000,
            },
          });
        },
      ));

      it('should not write the server-owned fields the caller happens to carry', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          // Reading a user document that never had these fields yields keys
          // whose value is `undefined`. Forwarding them makes Firestore reject
          // the whole update, which silently loses the new photo and name.
          const publicUser = {
            userId: '123',
            displayName: 'Super Mario',
            email: 'mario@test.com',
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            biteCount: undefined,
            subscriptionTier: undefined,
            normalizedDisplayName: undefined,
            createdAt: undefined,
          } as unknown as PublicUser;

          await service.updateUser(publicUser);

          // The shared spy accumulates calls across this describe, so read the
          // one this test just made rather than the first ever recorded.
          const calls = jest.mocked(FirebaseFirestore.updateDocument).mock
            .calls;
          const written = calls[calls.length - 1][0].data as Record<
            string,
            unknown
          >;

          expect(Object.keys(written)).not.toContain('biteCount');
          expect(Object.keys(written)).not.toContain('subscriptionTier');
          expect(Object.keys(written)).not.toContain('normalizedDisplayName');
          expect(Object.keys(written)).not.toContain('createdAt');
          expect(written).toMatchObject({
            displayName: 'Super Mario',
            photoUrl: 'download-url',
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

          expect(result).toEqual(publicUser);
        },
      ));
    });
  });

  describe('updateLastSeen', () => {
    beforeEach(() => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: undefined,
      });
    });

    it('should call updateLastSeen firebase function', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const updateDocumentMock = jest.mocked(
          FirebaseFirestore.updateDocument,
        );
        const updateDocumentCallCount = updateDocumentMock.mock.calls.length;

        await service.updateLastSeen();

        expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
          name: 'updateLastSeen',
        });
        expect(updateDocumentMock).toHaveBeenCalledTimes(
          updateDocumentCallCount,
        );
      },
    ));

    describe('given an error', () => {
      it('should handle the error', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const error = new Error('Failed to update last seen');
          jest.mocked(FirebaseFunctions.callByName).mockRejectedValue(error);

          await service.updateLastSeen();

          expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(error);
        },
      ));
    });
  });

  describe('updateUserMetadata', () => {
    beforeEach(() => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: undefined,
      });
    });

    it('should call updateUserMetadata firebase function', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const updateDocumentMock = jest.mocked(
          FirebaseFirestore.updateDocument,
        );
        const updateDocumentCallCount = updateDocumentMock.mock.calls.length;

        await service.updateUserMetadata();

        expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
          name: 'updateUserMetadata',
          data: {
            version: process.env['version'],
            buildNumber: process.env['buildNumber'],
          },
        });
        expect(updateDocumentMock).toHaveBeenCalledTimes(
          updateDocumentCallCount,
        );
      },
    ));

    it('should mark the metadata as updated after a successful call', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        (shouldUpdateUserMetadata as jest.Mock).mockResolvedValue(true);

        await service.updateUserMetadata();

        expect(markUserMetadataUpdated).toHaveBeenCalledWith('123');
      },
    ));

    it('should skip the Cloud Function when throttled', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        (shouldUpdateUserMetadata as jest.Mock).mockResolvedValue(false);
        jest.mocked(FirebaseFunctions.callByName).mockClear();
        (markUserMetadataUpdated as jest.Mock).mockClear();

        await service.updateUserMetadata();

        expect(FirebaseFunctions.callByName).not.toHaveBeenCalled();
        expect(markUserMetadataUpdated).not.toHaveBeenCalled();
      },
    ));

    describe('given an error', () => {
      it('should handle the error', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          (shouldUpdateUserMetadata as jest.Mock).mockResolvedValue(true);
          const error = new Error('Failed to update user metadata');
          jest.mocked(FirebaseFunctions.callByName).mockRejectedValue(error);

          await service.updateUserMetadata();

          expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(error);
        },
      ));
    });
  });

  describe('syncEmailVerificationStatus', () => {
    it('should call syncEmailVerificationStatus firebase function and return metadata', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const metadata = {
          emailVerified: false,
          emailVerificationRequired: true,
          emailVerificationProvider: 'password',
        } as const;
        jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
          data: metadata,
        });

        const result = await service.syncEmailVerificationStatus();

        expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
          name: 'syncEmailVerificationStatus',
        });
        expect(result).toEqual(metadata);
      },
    ));
  });

  describe('resendEmailVerification', () => {
    it('should call resendEmailVerification firebase function', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
          data: { status: 'sent' },
        });

        await service.resendEmailVerification();

        expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
          name: 'resendEmailVerification',
        });
      },
    ));
  });

  describe('claimDisplayName', () => {
    it('should call claimDisplayName firebase function and return the claim', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const claim = {
          displayName: 'Foodie',
          normalizedDisplayName: 'foodie',
        };
        jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
          data: claim,
        });

        const result = await service.claimDisplayName('Foodie');

        expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
          name: 'claimDisplayName',
          data: { displayName: 'Foodie' },
        });
        expect(result).toEqual(claim);
      },
    ));
  });

  describe('checkDisplayNameAvailability', () => {
    it('should call checkDisplayNameAvailability firebase function', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const availability = {
          available: true,
          normalizedDisplayName: 'foodie',
        };
        jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
          data: availability,
        });

        const result = await service.checkDisplayNameAvailability('Foodie');

        expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
          name: 'checkDisplayNameAvailability',
          data: { displayName: 'Foodie' },
        });
        expect(result).toEqual(availability);
      },
    ));
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
            getUser: (): any => undefined,
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
          jest.spyOn(MockedAuthService, 'getUser').mockReturnValue(undefined);

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
            getUser: (): any => ({ uid: 'current-user-id' }),
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
            .spyOn(MockedAuthService, 'getUser')
            .mockReturnValue(Promise.resolve({ uid: 'current-user-id' }));

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
          jest.spyOn(MockedAuthService, 'getUser').mockReturnValue(undefined);

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
    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('given followers found', () => {
      describe('with snapshot in doc', () => {
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
                    data: {
                      ...mockedFollowers.find((f: any) => f.id === userId),
                    },
                  },
                } as any);
              });

            const result =
              await service.fetchFollowersWithDetails('user-id-123');

            expect(fetchFollowersSpy).toHaveBeenCalledWith('user-id-123');
            expect(getDocumentSpy).toHaveBeenCalledTimes(2);
            expect(result).toEqual([
              { id: 'follower1', name: 'User follower1' },
              { id: 'follower2', name: 'User follower2' },
            ]);
          },
        ));
      });

      describe('without snapshot in doc', () => {
        it('should skip follower without snapshot', inject(
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
                if (userId === 'follower1') {
                  return Promise.resolve({
                    snapshot: null,
                  } as any);
                }
                return Promise.resolve({
                  snapshot: {
                    id: userId,
                    data: {
                      ...mockedFollowers.find((f: any) => f.id === userId),
                    },
                  },
                } as any);
              });

            const result =
              await service.fetchFollowersWithDetails('user-id-123');

            expect(fetchFollowersSpy).toHaveBeenCalledWith('user-id-123');
            expect(getDocumentSpy).toHaveBeenCalledTimes(2);
            expect(result).toEqual([
              { id: 'follower2', name: 'User follower2' },
            ]);
          },
        ));
      });
    });

    describe('given no followers found', () => {
      it('should return empty array', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const fetchFollowersSpy = jest
            .spyOn(service, 'fetchFollowers')
            .mockResolvedValue([]);

          const getDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockImplementation();

          const result = await service.fetchFollowersWithDetails('user-id-123');

          expect(fetchFollowersSpy).toHaveBeenCalledWith('user-id-123');
          expect(getDocumentSpy).not.toHaveBeenCalled();
          expect(result).toEqual([]);
        },
      ));
    });

    describe('given an error occurs', () => {
      it('should handle the error and return empty array', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          jest
            .spyOn(service, 'fetchFollowers')
            .mockRejectedValue(new Error('Failed to fetch followers'));

          const result = await service.fetchFollowersWithDetails('user-id-123');

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error fetching followers with details:',
            expect.any(Error),
          );
          expect(result).toEqual([]);
        },
      ));
    });
  });

  describe('fetchFollowingWithDetails', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('given followings found', () => {
      describe('with data', () => {
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

            const result =
              await service.fetchFollowingWithDetails('user-id-123');

            expect(fetchFollowingSpy).toHaveBeenCalledWith('user-id-123');
            expect(getDocumentSpy).toHaveBeenCalledTimes(2);
            expect(result).toEqual([
              { id: 'following1', name: 'User following1' },
              { id: 'following2', name: 'User following2' },
            ]);
          },
        ));
      });

      describe('with no data', () => {
        it('should skip following without data', inject(
          [ProfileApiService],
          async (service: ProfileApiService) => {
            const mockedFollowing = [
              { data: { followedUid: 'following1', name: 'User following1' } },
              { data: null },
            ] as any;

            const fetchFollowingSpy = jest
              .spyOn(service, 'fetchFollowing')
              .mockResolvedValue(mockedFollowing);

            const getDocumentSpy = jest
              .spyOn(FirebaseFirestore, 'getDocument')
              .mockImplementation(({ reference }) => {
                const userId = reference.split('/')[1];
                const { followedUid, ...rest } = mockedFollowing.find(
                  (f: any) => f.data && f.data.followedUid === userId,
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

            const result =
              await service.fetchFollowingWithDetails('user-id-123');

            expect(fetchFollowingSpy).toHaveBeenCalledWith('user-id-123');
            expect(getDocumentSpy).toHaveBeenCalledTimes(1);
            expect(result).toEqual([
              { id: 'following1', name: 'User following1' },
            ]);
          },
        ));
      });
    });

    describe('given no followings found', () => {
      it('should return empty array', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const fetchFollowingSpy = jest
            .spyOn(service, 'fetchFollowing')
            .mockResolvedValue([]);

          const getDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'getDocument')
            .mockImplementation();

          const result = await service.fetchFollowingWithDetails('user-id-123');

          expect(fetchFollowingSpy).toHaveBeenCalledWith('user-id-123');
          expect(getDocumentSpy).not.toHaveBeenCalled();
          expect(result).toEqual([]);
        },
      ));
    });

    describe('given an error occurs', () => {
      it('should handle the error and return empty array', inject(
        [ProfileApiService],
        async (service: ProfileApiService) => {
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          jest
            .spyOn(service, 'fetchFollowing')
            .mockRejectedValue(new Error('Failed to fetch following'));

          const result = await service.fetchFollowingWithDetails('user-id-123');

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error fetching following with details:',
            expect.any(Error),
          );
          expect(result).toEqual([]);
        },
      ));
    });
  });

  describe('uploadImage', () => {
    it('should call uploadBase64ToFirebaseStorage and return download url', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        const BASE64_PHOTO =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

        await service.uploadImage(
          {
            photoUrl: BASE64_PHOTO,
            userId: '123',
          } as PublicUser,
          () => {
            /** Something */
          },
        );

        expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith({
          base64: BASE64_PHOTO,
          collection: 'users',
          docId: '123',
          callbackFn: expect.any(Function),
        });
      },
    ));
  });

  describe('updatePhotoUrlInUser', () => {
    it('should call updateProfileWithImagePathFromFirebaseStorage, load and return profile', inject(
      [ProfileApiService],
      async (service: ProfileApiService) => {
        await service.updatePhotoUrlInUser(
          { userId: 'user-id-123' } as PublicUser,
          'new-photo-url',
        );

        expect(
          updateProfileWithImagePathFromFirebaseStorage,
        ).toHaveBeenCalledWith(
          'new-photo-url',
          {
            userId: 'user-id-123',
          },
          'user-id-123',
        );

        expect(loadProfileById).toHaveBeenCalledWith('user-id-123');
      },
    ));
  });
});

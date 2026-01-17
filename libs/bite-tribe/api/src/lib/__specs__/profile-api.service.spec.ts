import { ProfileApiService } from '../profile-api.service';
import { AuthService } from 'ta-firestore';
import { inject, TestBed } from '@angular/core/testing';
import { isEmpty, lastValueFrom, of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { PublicUser } from 'model';
import { TestScheduler } from 'rxjs/testing';

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
  },
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

describe(ProfileApiService.name, () => {
  let scheduler: TestScheduler;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });
  });

  it('should create', inject(
    [ProfileApiService],
    (service: ProfileApiService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('publicProfile$', () => {
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
    });

    describe('updateUser', () => {
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

    describe('getUserByBiteId', () => {
      describe('given no bite', () => {
        it('should return empty observable', inject(
          [ProfileApiService],
          async (service: ProfileApiService) => {
            const result = service.getUserByBiteId(undefined);

            expect(await lastValueFrom(result.pipe(isEmpty()))).toBeTruthy();
          },
        ));
      });

      describe('given a bite', () => {
        it('should call FirebaseFirestore.getDocument', inject(
          [ProfileApiService],
          async (service: ProfileApiService) => {
            const mockedData = {
              snapshot: {
                data: {
                  userId: 'bite-user-id',
                  name: 'Bite User',
                },
              },
            } as any;

            const getDocumentSpy = jest
              .spyOn(FirebaseFirestore, 'getDocument')
              .mockResolvedValue(mockedData);

            const bite = { userId: 'bite-user-id' } as any;

            const result$ = service.getUserByBiteId(bite);

            const result = await lastValueFrom(result$);

            expect(getDocumentSpy).toHaveBeenCalledWith({
              reference: 'users/bite-user-id',
            });
            expect(result).toEqual(mockedData);
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

            const setDocumentSpy = jest
              .spyOn(FirebaseFirestore, 'setDocument')
              .mockResolvedValue();

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

      beforeEach(() => {
        updateDocumentSpy.mockClear();
      });

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
    });
  });
});

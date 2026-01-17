import { ProfileApiService } from '../profile-api.service';
import { AuthService } from 'ta-firestore';
import { TestBed } from '@angular/core/testing';
import { isEmpty, lastValueFrom, of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { PublicUser } from 'model';

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
  let service: ProfileApiService;
  let authService: AuthService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(ProfileApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startListener', () => {
    let addCollectionSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addCollectionSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockResolvedValue('mocked-callback-id');
    });

    it('should start the listener', async () => {
      await service.startListener();

      expect(addCollectionSnapshotListenerSpy).toHaveBeenCalled();
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      nextSpy = jest
        .spyOn((service as any).profileChannel$, 'next')
        .mockImplementation();
    });

    it('should handle the response and update profile channel', () => {
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
    });
  });

  describe('stopProfileListener', () => {
    it('should call stopped$.next and removeSnapshotListener', async () => {
      const removeSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'removeSnapshotListener')
        .mockResolvedValue();

      const callbackId = 'test-callback-id';

      await service.stopProfileListener(callbackId);

      expect(removeSnapshotListenerSpy).toHaveBeenCalledWith({
        callbackId,
      });
    });
  });

  describe('saveUser', () => {
    it('should call FirebaseFirestore.setDocument', async () => {
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
    });
  });

  describe('updateUser', () => {
    it('should call FirebaseFirestore.updateDocument', async () => {
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
    });
  });

  describe('getUserByBiteId', () => {
    describe('given no bite', () => {
      it('should return empty observable', async () => {
        const result = service.getUserByBiteId(undefined);

        expect(await lastValueFrom(result.pipe(isEmpty()))).toBeTruthy();
      });
    });

    describe('given a bite', () => {
      it('should call FirebaseFirestore.getDocument', async () => {
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
      });
    });
  });

  describe('saveUserIfNotExisting', () => {
    let getDocumentSpy: jest.SpyInstance;
    let setUserPublicFlagSpy: jest.SpyInstance;

    beforeEach(() => {
      setUserPublicFlagSpy = jest
        .spyOn(service, 'setUserPublicFlag')
        .mockResolvedValue();
    });

    afterEach(() => {
      setUserPublicFlagSpy.mockReset();
    });

    describe('given not existing user', () => {
      it('should save user if not existing', async () => {
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
      });
    });

    describe('given existing user without public flag', () => {
      it('should not save user but call setUserPublicFlag with uid', async () => {
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
      });
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
      it('should not call updateDocument', async () => {
        await service.setUserPublicFlag('');

        expect(updateDocumentSpy).not.toHaveBeenCalled();
      });
    });

    describe('given a uid', () => {
      it('should call updateDocument with public true', async () => {
        await service.setUserPublicFlag('123');

        expect(updateDocumentSpy).toHaveBeenCalledWith({
          reference: 'users/123',
          data: {
            public: true,
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });
  });

  describe('followUser', () => {
    it('should build followRelationship and call FirebaseFirestore.setDocument for both users', async () => {
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
    });
  });
});

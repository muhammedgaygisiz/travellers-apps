import { BucketlistApiService } from '../bucketlist-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as loadBucketlistsByUserIdUtil from '../utils/load-bucketlists-by-user-id';

jest.mock('../utils/load-bucketlists-by-user-id', () => ({
  loadBucketlistsByUserId: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor-firebase/firestore');

const MockedAuthService = {
  getUser: (): any => ({ uid: '123' }),
};

describe(BucketlistApiService.name, () => {
  let service: BucketlistApiService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(BucketlistApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loadBucketlistsByUserId', () => {
    it('should call loadBucketlistsByUserId utility function', async () => {
      const userId = 'userId123';
      await service.loadBucketlistsByUserId(userId);
      expect(
        loadBucketlistsByUserIdUtil.loadBucketlistsByUserId,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe('saveBiteIdToBucketList', () => {
    let getDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      getDocumentSpy = jest.spyOn(FirebaseFirestore, 'getDocument');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call FirebaseFirestore.getDocument', async () => {
      getDocumentSpy.mockResolvedValue({
        snapshot: { data: { biteIds: [] } },
      } as any);

      await service.saveBiteIdToBucketList({
        bucketListId: '1',
        biteId: 'bite1',
      });

      expect(getDocumentSpy).toHaveBeenCalledWith({
        reference: `bucketlists/1`,
      });
    });

    describe('given returned bucketlist', () => {
      it('should call FirebaseFirestore.updateDocument with new biteIds', async () => {
        getDocumentSpy.mockResolvedValue({
          snapshot: {
            data: { biteIds: ['bite0'] },
            path: 'bucketlists/1',
          },
        } as any);

        await service.saveBiteIdToBucketList({
          bucketListId: '1',
          biteId: 'bite1',
        });

        expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
          reference: `bucketlists/1`,
          data: {
            biteIds: ['bite0', 'bite1'],
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });
  });

  describe('createBucketListAndSaveBiteIdToBucketList', () => {
    describe('given a biteId', () => {
      it('should create a new bucketlist and save biteId to it', async () => {
        const addDocumentMock = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({ reference: { path: 'path' } } as any);

        const getDocumentMock = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: { data: {} },
          } as any);

        await service.createBucketListAndSaveBiteIdToBucketList({
          bucketListName: 'My Bucketlist',
          biteId: 'bite1',
        });

        expect(addDocumentMock).toHaveBeenCalled();
        expect(addDocumentMock).toHaveBeenCalledWith({
          reference: 'bucketlists',
          data: {
            userId: '123',
            name: 'My Bucketlist',
            biteIds: ['bite1'],
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });
        expect(getDocumentMock).toHaveBeenCalledWith({
          reference: 'path',
        });
      });
    });

    describe('given no biteId', () => {
      it('should create a new bucketlist with empty biteIds', async () => {
        const addDocumentMock = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({ reference: { path: 'path' } } as any);

        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
          snapshot: { data: {} } as any,
        });

        const result = await service.createBucketListAndSaveBiteIdToBucketList({
          bucketListName: 'My Bucketlist',
          biteId: undefined,
        });

        expect(addDocumentMock).toHaveBeenCalled();
        expect(addDocumentMock).toHaveBeenCalledWith({
          reference: 'bucketlists',
          data: {
            userId: '123',
            name: 'My Bucketlist',
            biteIds: [],
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });
        expect(result).toEqual({});
      });
    });
  });

  describe('createBucketListFromBiteTrail', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should throw when user is not authenticated', async () => {
      jest.clearAllMocks();

      const getUserSpy = jest
        .spyOn(MockedAuthService, 'getUser')
        .mockReturnValue(undefined);
      const addDocumentMock = jest.spyOn(FirebaseFirestore, 'addDocument');

      await expect(
        service.createBucketListFromBiteTrail({
          bucketListName: 'Free Trail',
          biteIds: ['bite-1'],
          biteTrailId: 'trail-1',
        }),
      ).rejects.toThrow('User not authenticated');

      expect(addDocumentMock).not.toHaveBeenCalled();
    });

    it('should create bucketlist and write sell in bite trail sub-collection', async () => {
      jest.clearAllMocks();

      const addDocumentMock = jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValueOnce({
          reference: { path: 'bucketlists/new-bucketlist' },
        } as any)
        .mockResolvedValueOnce({
          reference: { path: 'biteTrails/trail-1/sells/sell-1' },
        } as any);

      const getDocumentMock = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: { data: { id: 'new-bucketlist' } },
        } as any);

      await service.createBucketListFromBiteTrail({
        bucketListName: 'Free Trail',
        biteIds: ['bite-1', 'bite-2'],
        biteTrailId: 'trail-1',
      });

      expect(addDocumentMock).toHaveBeenNthCalledWith(1, {
        reference: 'bucketlists',
        data: {
          userId: '123',
          name: 'Free Trail',
          biteIds: ['bite-1', 'bite-2'],
          biteTrailId: 'trail-1',
          createdAt: '2024-03-15T12:00:00.000Z',
          createdAtTimestamp: 1710504000000,
        },
      });

      expect(addDocumentMock).toHaveBeenNthCalledWith(2, {
        reference: 'biteTrails/trail-1/sells',
        data: {
          userId: '123',
          soldAt: '2024-03-15T12:00:00.000Z',
          soldAtTimestamp: 1710504000000,
        },
      });

      expect(getDocumentMock).toHaveBeenCalledWith({
        reference: 'bucketlists/new-bucketlist',
      });
    });

    it('should rollback bucketlist creation if sell write fails', async () => {
      jest.clearAllMocks();

      const error = new Error('Failed to save sell');
      const addDocumentMock = jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValueOnce({
          reference: { path: 'bucketlists/new-bucketlist' },
        } as any)
        .mockRejectedValueOnce(error);
      const deleteDocumentMock = jest
        .spyOn(FirebaseFirestore, 'deleteDocument')
        .mockResolvedValue({} as any);

      await expect(
        service.createBucketListFromBiteTrail({
          bucketListName: 'Free Trail',
          biteIds: ['bite-1', 'bite-2'],
          biteTrailId: 'trail-1',
        }),
      ).rejects.toThrow('Failed to save sell');

      expect(deleteDocumentMock).toHaveBeenCalledWith({
        reference: 'bucketlists/new-bucketlist',
      });
    });
  });

  describe('removeBiteFromBucketlist', () => {
    let getDocumentSpy: jest.SpyInstance;
    let updateDocumentMock: jest.SpyInstance;

    beforeEach(() => {
      getDocumentSpy = jest.spyOn(FirebaseFirestore, 'getDocument');
      updateDocumentMock = jest.spyOn(FirebaseFirestore, 'updateDocument');
    });

    afterEach(() => {
      getDocumentSpy.mockClear();
      updateDocumentMock.mockClear();
    });

    describe('given a bucketlist doc', () => {
      it('should remove biteId from the bucketlist', async () => {
        getDocumentSpy.mockResolvedValue({
          snapshot: {
            data: {
              biteIds: ['bite1', 'bite2', 'bite3'],
              triedOutBites: [{ biteId: 'bite2' }, { biteId: 'bite3' }],
            },
          },
        } as any);

        await service.removeBiteFromBucketlist({
          bucketlistId: '1',
          biteId: 'bite2',
        });

        expect(updateDocumentMock).toHaveBeenCalledWith({
          reference: `bucketlists/1`,
          data: {
            biteIds: ['bite1', 'bite3'],
            triedOutBites: [{ biteId: 'bite3' }],
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });

    describe('given no bucektlist doc', () => {
      it('should call updateDocument with biteIds undefined', async () => {
        getDocumentSpy.mockResolvedValue(undefined as any);

        await service.removeBiteFromBucketlist({
          bucketlistId: '1',
          biteId: 'bite2',
        });

        expect(updateDocumentMock).toHaveBeenCalledWith({
          reference: `bucketlists/1`,
          data: {
            biteIds: undefined,
            triedOutBites: undefined,
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });

    describe('given an error', () => {
      it('should handle error', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        getDocumentSpy.mockRejectedValue(new Error('Failed to get document'));

        try {
          await service.removeBiteFromBucketlist({} as any);
        } catch (e) {
          // do nothing
        }

        expect(consoleErrorSpy).toHaveBeenLastCalledWith(
          'Error removing bite from bucket list:',
          expect.any(Error),
        );
      });
    });
  });

  describe('createBucketList', () => {
    let addDocumentMock: jest.SpyInstance;

    beforeEach(() => {
      addDocumentMock = jest.spyOn(FirebaseFirestore, 'addDocument');
    });

    afterEach(() => {
      addDocumentMock.mockClear();
    });

    describe('given no error', () => {
      it('should create a new bucketlist', async () => {
        addDocumentMock.mockResolvedValue({} as any);
        await service.createBucketList('My Bucketlist');

        expect(addDocumentMock).toHaveBeenCalled();
        expect(addDocumentMock).toHaveBeenCalledWith({
          reference: 'bucketlists',
          data: {
            userId: '123',
            name: 'My Bucketlist',
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });
      });
    });

    describe('given an error', () => {
      it('should handle error', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        addDocumentMock.mockRejectedValue(new Error('Failed to add document'));

        try {
          await service.createBucketList('My Bucketlist');
        } catch (e) {
          // do nothing
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error creating bucket list:',
          expect.any(Error),
        );
      });
    });
  });

  describe('deleteBucketlist', () => {
    let deleteDocumentMock: jest.SpyInstance;

    beforeEach(() => {
      deleteDocumentMock = jest.spyOn(FirebaseFirestore, 'deleteDocument');
    });

    afterEach(() => {
      deleteDocumentMock.mockClear();
    });

    describe('given no error', () => {
      it('should delete the bucketlist', async () => {
        deleteDocumentMock.mockResolvedValue({} as any);
        await service.deleteBucketlist('1');

        expect(deleteDocumentMock).toHaveBeenCalled();
        expect(deleteDocumentMock).toHaveBeenCalledWith({
          reference: `bucketlists/1`,
        });
      });
    });

    describe('given an error', () => {
      it('should handle error', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        deleteDocumentMock.mockRejectedValue(
          new Error('Failed to delete document'),
        );

        try {
          await service.deleteBucketlist('1');
        } catch (e) {
          // do nothing
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error deleting bucket list:',
          expect.any(Error),
        );
      });
    });
  });

  describe('updateBucketlistName', () => {
    let updateDocumentMock: jest.SpyInstance;

    beforeEach(() => {
      updateDocumentMock = jest.spyOn(FirebaseFirestore, 'updateDocument');
    });

    afterEach(() => {
      updateDocumentMock.mockClear();
    });

    describe('given no error', () => {
      it('should update the bucketlist name', async () => {
        updateDocumentMock.mockResolvedValue({} as any);
        await service.updateBucketlistName('1', 'New Name');

        expect(updateDocumentMock).toHaveBeenCalled();
        expect(updateDocumentMock).toHaveBeenCalledWith({
          reference: `bucketlists/1`,
          data: {
            name: 'New Name',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });

    describe('given an error', () => {
      it('should handle error', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        updateDocumentMock.mockRejectedValue(
          new Error('Failed to update document'),
        );

        try {
          await service.updateBucketlistName('1', 'New Name');
        } catch (e) {
          // do nothing
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error updating bucket list name:',
          expect.any(Error),
        );
      });
    });
  });

  describe('updateBucketlistTriedOutStatus', () => {
    it('should add tried out bite when checked is true', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          data: {
            triedOutBites: [
              {
                biteId: 'bite2',
                date: '2024-03-15T12:00:00.000Z',
                timestamp: 1710504000000,
              },
            ],
          },
        },
      } as any);

      const updateDocumentSpy = jest.spyOn(FirebaseFirestore, 'updateDocument');
      updateDocumentSpy.mockResolvedValue({} as any);

      await service.updateBucketlistTriedOutStatus({
        bucketlistId: '1',
        biteId: 'bite1',
        checked: true,
      });

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bucketlists/1',
        data: {
          triedOutBites: [
            {
              biteId: 'bite2',
              date: '2024-03-15T12:00:00.000Z',
              timestamp: 1710504000000,
            },
            {
              biteId: 'bite1',
              date: '2024-03-15T12:00:00.000Z',
              timestamp: 1710504000000,
            },
          ],
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });

    it('should remove tried out bite when checked is false', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          data: {
            triedOutBites: [
              {
                biteId: 'bite1',
                date: '2024-03-14T10:00:00.000Z',
                timestamp: 1710410400000,
              },
              {
                biteId: 'bite2',
                date: '2024-03-14T11:00:00.000Z',
                timestamp: 1710414000000,
              },
            ],
          },
        },
      } as any);

      const updateDocumentSpy = jest.spyOn(FirebaseFirestore, 'updateDocument');
      updateDocumentSpy.mockResolvedValue({} as any);

      await service.updateBucketlistTriedOutStatus({
        bucketlistId: '1',
        biteId: 'bite1',
        checked: false,
      });

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bucketlists/1',
        data: {
          triedOutBites: [
            {
              biteId: 'bite2',
              date: '2024-03-14T11:00:00.000Z',
              timestamp: 1710414000000,
            },
          ],
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });
  });
});

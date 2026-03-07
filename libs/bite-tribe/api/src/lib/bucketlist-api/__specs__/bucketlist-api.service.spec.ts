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
            data: { biteIds: ['bite1', 'bite2', 'bite3'] },
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
            biteIds: [],
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
});

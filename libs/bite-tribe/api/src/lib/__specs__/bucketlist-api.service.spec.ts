import { BucketlistApiService } from '../bucketlist-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    addDocument: jest.fn(),
  },
}));

const MockedAuthService = {
  authState: (): any => ({ user: { uid: '123' } }),
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

  describe('startListener', () => {
    let addCollectionSnapshotListnerMock: jest.SpyInstance;

    beforeEach(() => {
      addCollectionSnapshotListnerMock = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockResolvedValue('callbackId');
    });

    it('should start the listener', async () => {
      await service.startListener();

      expect(addCollectionSnapshotListnerMock).toHaveBeenCalled();
    });

    describe('given passed callback of listener', () => {
      it('should handle response when listener callback is invoked', async () => {
        await service.startListener();

        const mockDocs = {
          snapshots: [
            { id: 1, data: { name: 'Bucketlist 1' } },
            { id: 2, data: { name: 'Bucketlist 2' } },
          ],
        } as any;

        // Simulate the listener callback invocation
        const listenerCallback =
          addCollectionSnapshotListnerMock.mock.calls[0][1];

        listenerCallback(mockDocs);
      });
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      nextSpy = jest
        .spyOn((service as any)._bucketlistsChannel$, 'next')
        .mockImplementation();
    });

    it('should process bucketlist documents and update the bucketlists$', () => {
      const mockDocs = {
        snapshots: [
          { id: 1, data: { name: 'Bucketlist 1' } },
          { id: 2, data: { name: 'Bucketlist 2' } },
        ],
      } as any;

      service.handleResponse(mockDocs);

      expect(nextSpy).toHaveBeenCalledWith([
        { id: 1, name: 'Bucketlist 1' },
        { id: 2, name: 'Bucketlist 2' },
      ]);
    });
  });

  describe('stopBucketlistListener', () => {
    it('should call stopped$.next and removeSnapshotListener', async () => {
      const removeSnapshotListenerMock = jest
        .spyOn(FirebaseFirestore, 'removeSnapshotListener')
        .mockResolvedValue();

      const stoppedNextSpy = jest
        .spyOn((service as any).stopped$, 'next')
        .mockImplementation();

      const callbackId = 'testCallbackId';

      await service.stopBucketlistListener(callbackId);

      expect(stoppedNextSpy).toHaveBeenCalled();
      expect(removeSnapshotListenerMock).toHaveBeenCalledWith({
        callbackId,
      });
    });
  });

  describe('saveBiteIdToBucketList', () => {
    it('should call FirebaseFirestore.getDocument', async () => {
      const getDocumentMock = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          data: { biteIds: [] },
        } as any);

      await service.saveBiteIdToBucketList({
        bucketListId: '1',
        biteId: 'bite1',
      });

      expect(getDocumentMock).toHaveBeenCalledWith({
        reference: `bucketlists/1`,
      });
    });

    describe('given returned bucketlist', () => {
      it('should call FirebaseFirestore.updateDocument with new biteIds', async () => {
        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
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

    describe('given an error', () => {
      it('should handle error', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockRejectedValue(new Error('Failed to get document'));

        try {
          await service.saveBiteIdToBucketList({} as any);
        } catch (e) {
          // do nothing
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error saving bite ID to bucket list:',
          expect.any(Error),
        );
      });
    });
  });

  describe('createBucketListAndSaveBiteIdToBucketList', () => {
    describe('given a biteId', () => {
      it('should create a new bucketlist and save biteId to it', async () => {
        const addDocumentMock = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

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
      });
    });

    describe('given no biteId', () => {
      it('should create a new bucketlist with empty biteIds', async () => {
        const addDocumentMock = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

        await service.createBucketListAndSaveBiteIdToBucketList({
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
      });
    });

    describe('given error', () => {
      it('should handle', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockRejectedValue(new Error('Failed to add document'));

        try {
          await service.createBucketListAndSaveBiteIdToBucketList({
            bucketListName: 'My Bucketlist',
            biteId: 'bite1',
          });
        } catch (e) {
          // do nothing
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error creating bucket list and saving bite ID:',
          expect.any(Error),
        );
      });
    });
  });

  describe('removeBiteFromBucketlist', () => {
    describe('given no error', () => {
      it('should remove biteId from the bucketlist', async () => {
        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
          snapshot: {
            data: { biteIds: ['bite1', 'bite2', 'bite3'] },
          },
        } as any);

        await service.removeBiteFromBucketlist({
          bucketlistId: '1',
          biteId: 'bite2',
        });

        expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
          reference: `bucketlists/1`,
          data: {
            biteIds: ['bite1', 'bite3'],
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

        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockRejectedValue(new Error('Failed to get document'));

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
    it('should create a new bucketlist', async () => {
      const addDocumentMock = jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValue({} as any);

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
});

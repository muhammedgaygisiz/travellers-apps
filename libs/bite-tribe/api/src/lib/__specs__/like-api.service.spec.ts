import { LikeApiService } from '../like-api.service';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionGroupSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    setDocument: jest.fn(),
    deleteDocument: jest.fn(),
  },
}));

const MockedAuthService = {
  authState: (): any => ({ user: { uid: '123' } }),
};

describe(LikeApiService.name, () => {
  let service: LikeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(LikeApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startListener', () => {
    let addCollectionGroupSnapshotListenerMock: jest.SpyInstance;

    beforeEach(() => {
      addCollectionGroupSnapshotListenerMock = jest
        .spyOn(FirebaseFirestore, 'addCollectionGroupSnapshotListener')
        .mockResolvedValue('callbackId');
    });

    it('should start the listener', async () => {
      await service.startListener();

      expect(addCollectionGroupSnapshotListenerMock).toHaveBeenCalled();
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      nextSpy = jest
        .spyOn((service as any)._likesChannel$, 'next')
        .mockImplementation();
    });

    it('should process likes and update the likesChannel$', () => {
      const mockLikeDocs = {
        snapshots: [
          { data: { likeType: 'like', biteId: 'bite1' } },
          { data: { likeType: 'love', biteId: 'bite2' } },
        ],
      } as any;

      service.handleResponse(mockLikeDocs);

      expect(nextSpy).toHaveBeenCalledWith([
        { likeType: 'like', biteId: 'bite1' },
        { likeType: 'love', biteId: 'bite2' },
      ]);
    });
  });

  describe('stopLikesListener', () => {
    it('should call stopped$.next and removeSnapshotListener', async () => {
      const removeSnapshotListenerMock = jest
        .spyOn(FirebaseFirestore, 'removeSnapshotListener')
        .mockResolvedValue();

      const callbackId = 'testCallbackId';
      await service.stopLikesListener(callbackId);

      expect(removeSnapshotListenerMock).toHaveBeenCalledWith({ callbackId });
    });
  });

  describe('saveLike', () => {
    it('should call FirebaseFirestore.setDocument', async () => {
      const setDocumentMock = jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockResolvedValue();

      const like = {
        likeType: 'thumbup',
        biteId: 'bite123',
        createdAt: '2024-06-01T00:00:00Z',
      };

      await service.saveLike(like);

      expect(setDocumentMock).toHaveBeenCalledWith({
        reference: `bites/${like.biteId}/likes/123`,
        data: {
          ...like,
          userId: '123',
        },
      });
    });
  });

  describe('removeLike', () => {
    it('should call FirebaseFirestore.deleteDocument', async () => {
      const deleteDocumentMock = jest
        .spyOn(FirebaseFirestore, 'deleteDocument')
        .mockResolvedValue();

      const like = {
        biteId: 'bite123',
      };

      await service.removeLike(like);

      expect(deleteDocumentMock).toHaveBeenCalledWith({
        reference: `bites/${like.biteId}/likes/123`,
      });
    });
  });
});

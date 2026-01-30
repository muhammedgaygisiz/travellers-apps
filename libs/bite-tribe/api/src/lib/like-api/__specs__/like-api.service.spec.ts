import { LikeApiService } from '../like-api.service';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { ErrorHandler } from '@angular/core';
import { Like } from 'model';
import * as loadLikesByBitesUtils from '../utils/load-likes-by-bites';

jest.mock('../utils/load-likes-by-bites', () => ({
  loadLikesByBites: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionGroupSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    setDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getDocument: jest.fn(),
  },
}));

const MockedAuthService = {
  getUser: (): any => ({ uid: '123' }),
};

const ErrorHandlerMock = {
  handleError: jest.fn(),
};

describe(LikeApiService.name, () => {
  let service: LikeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: ErrorHandler, useValue: ErrorHandlerMock },
      ],
    });

    service = TestBed.inject(LikeApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loadLikesForBites', () => {
    it('should call loadLikesByBites utility function', async () => {
      const bites = [{ id: 'bite1' }, { id: 'bite2' }] as any;

      await service.loadLikesForBites(bites);

      expect(loadLikesByBitesUtils.loadLikesByBites).toHaveBeenCalledWith(
        bites,
      );
    });
  });

  describe('saveLike', () => {
    it('should call FirebaseFirestore.setDocument', async () => {
      const setDocumentMock = jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockResolvedValue();

      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          data: {
            likeType: 'thumbup',
            biteId: 'bite123',
            createdAt: '2024-06-01T00:00:00Z',
            userId: '123',
          },
        } as any,
      });

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

    describe('given an error', () => {
      it('should log the error to console', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        jest
          .spyOn(FirebaseFirestore, 'setDocument')
          .mockRejectedValue(new Error('Failed to save like'));

        const like = {
          likeType: 'thumbup',
          biteId: 'bite123',
          createdAt: '2024-06-01T00:00:00Z',
        };

        await service.saveLike(like);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error saving like:',
          expect.any(Error),
        );
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
      } as Like;

      await service.removeLike(like);

      expect(deleteDocumentMock).toHaveBeenCalledWith({
        reference: `bites/${like.biteId}/likes/123`,
      });
    });

    describe('given an error', () => {
      it('should handle the error', async () => {
        const consoleErrorSpy = jest
          .spyOn(console, 'error')
          .mockImplementation();

        jest
          .spyOn(FirebaseFirestore, 'deleteDocument')
          .mockRejectedValue(new Error('Failed to remove like'));

        const like = {
          biteId: 'bite123',
        } as Like;

        try {
          await service.removeLike(like);
        } catch (error) {
          // Expected to throw
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error removing like:',
          expect.any(Error),
        );
      });
    });
  });
});

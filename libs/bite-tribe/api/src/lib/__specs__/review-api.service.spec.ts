import { ReviewApiService } from '../review-api.service';
import { inject, TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { isEmpty, lastValueFrom, of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionSnapshotListener: jest.fn(),
    addDocument: jest.fn(),
  },
}));

const MockedAuthService = {
  authState: (): any => ({ user: { uid: '123', displayName: 'El Mo' } }),
  isLoggedIn$: of(false),
};

describe(ReviewApiService.name, () => {
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });
  });

  it('should create', inject(
    [ReviewApiService],
    (service: ReviewApiService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('startReviewListener', () => {
    let addCollectionSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addCollectionSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockResolvedValue('mocked-callback-id');
    });

    it('should start the listener', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        await service.startReviewListener('');

        expect(addCollectionSnapshotListenerSpy).toHaveBeenCalled();
      },
    ));
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    it('should handle the response and update reviews channel', inject(
      [ReviewApiService],
      (service: ReviewApiService) => {
        nextSpy = jest
          .spyOn((service as any).reviewsChannel$, 'next')
          .mockImplementation();

        const mockDocs = {
          snapshots: [
            { id: '1', data: { name: 'Restaurant 1' } },
            { id: '2', data: { name: 'Restaurant 2' } },
          ],
        } as any;

        service.handleResponse(mockDocs);

        expect(nextSpy).toHaveBeenCalled();
      },
    ));
  });

  describe('reviewsByBiteId', () => {
    describe('given logged in true', () => {
      beforeEach(() => {
        TestBed.overrideProvider(AuthService, {
          useValue: { ...MockedAuthService, isLoggedIn$: of(true) },
        });
      });

      it('should call startReviewListener', inject(
        [ReviewApiService],
        async (service: ReviewApiService) => {
          const startReviewListenerSpy = jest
            .spyOn(service, 'startReviewListener')
            .mockResolvedValue();

          const result$ = service.reviewsByBiteId('biteId123');
          expect(await lastValueFrom(result$.pipe(isEmpty()))).toBeFalsy();

          expect(startReviewListenerSpy).toHaveBeenCalledWith('biteId123');
        },
      ));
    });
  });

  describe('saveNewReview', () => {
    it('should call FirebaseFirestore.addDocument', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        const addDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

        const payload = {
          review: 'Great food!',
          rating: 5,
          biteId: 'biteId123',
          userId: 'userId123',
        };

        await service.saveNewReview(payload);
        expect(addDocumentSpy).toHaveBeenCalledWith({
          reference: 'reviews',
          data: {
            author: 'El Mo',
            authorId: '123',
            biteId: '/bites/biteId123',
            review: 'Great food!',
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });
      },
    ));

    describe('given an error', () => {
      it('should handle the error', inject(
        [ReviewApiService],
        async (service: ReviewApiService) => {
          jest
            .spyOn(FirebaseFirestore, 'addDocument')
            .mockRejectedValue(new Error('Firestore error'));
          const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

          const payload = {
            review: 'Great food!',
            rating: 5,
            biteId: 'biteId123',
            userId: 'userId123',
          };

          try {
            await service.saveNewReview(payload);
          } catch {
            // Swallow the error for test
          }

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error saving new review:',
            expect.any(Error),
          );
        },
      ));
    });
  });
});

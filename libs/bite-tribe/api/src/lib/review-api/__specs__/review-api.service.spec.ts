import { ReviewApiService } from '../review-api.service';
import { inject, TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as loadReviewsByBiteIdUtils from '../utils/load-review-by-bite-id';

jest.mock('../utils/load-review-by-bite-id', () => ({
  loadReviewsByBiteId: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor-firebase/firestore');

const MockedAuthService = {
  getUser: (): unknown => ({ uid: '123', displayName: 'El Mo' }),
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

  describe('reviewsByBiteId', () => {
    it('should call loadReviewsByBiteId utility function', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        const biteId = 'biteId123';
        await service.reviewsByBiteId(biteId);
        expect(
          loadReviewsByBiteIdUtils.loadReviewsByBiteId,
        ).toHaveBeenCalledWith(biteId);
      },
    ));
  });

  describe('saveNewReview', () => {
    it('should call FirebaseFirestore.addDocument', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        const addDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as unknown as never);

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

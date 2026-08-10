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

// The name on the account's profile. It is deliberately not the name the
// Firebase Auth user carries: a Google or Apple sign-in supplies the person's
// legal name there, and publishing that on a review is issue #1308.
const profiles: Record<string, Record<string, unknown> | null> = {
  '123': { userId: '123', displayName: 'El Mo' },
};

const MockedAuthService = {
  getUser: (): any => ({ uid: '123', displayName: 'Muhammed Gaygisiz' }),
  isLoggedIn$: of(false),
};

describe(ReviewApiService.name, () => {
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    (FirebaseFirestore.getDocument as jest.Mock).mockImplementation(
      async ({ reference }: { reference: string }) => ({
        snapshot: {
          data: profiles[reference.split('/').pop() as string] ?? null,
        },
      }),
    );
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

    // The account signs in with Google and Apple, so the Firebase Auth user
    // carries the legal name and the profile carries the chosen one. They are
    // identical on an email and password account, which is why this defect
    // survived six release-candidate runs. See GitHub issue #1308.
    it('attributes the review to the profile display name, not the provider name', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        const addDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

        await service.saveNewReview({
          review: 'Great food!',
          biteId: 'biteId123',
        });

        expect(addDocumentSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              author: 'El Mo',
              authorId: '123',
            }),
          }),
        );
      },
    ));

    describe('given an account with no readable profile', () => {
      it('writes no name at all rather than the provider one', inject(
        [ReviewApiService],
        async (service: ReviewApiService) => {
          (FirebaseFirestore.getDocument as jest.Mock).mockResolvedValue({
            snapshot: { data: null },
          });
          const addDocumentSpy = jest
            .spyOn(FirebaseFirestore, 'addDocument')
            .mockResolvedValue({} as any);

          await service.saveNewReview({
            review: 'Great food!',
            biteId: 'biteId123',
          });

          expect(addDocumentSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({ author: '' }),
            }),
          );
        },
      ));
    });

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

  describe('saveReply', () => {
    it('writes the reply into the same collection, marked with its thread', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        const addDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

        await service.saveReply({
          review: 'Thanks! Try the garlic sauce next time.',
          biteId: 'biteId123',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        });

        expect(addDocumentSpy).toHaveBeenCalledWith({
          reference: 'reviews',
          data: {
            author: 'El Mo',
            authorId: '123',
            biteId: '/bites/biteId123',
            review: 'Thanks! Try the garlic sauce next time.',
            parentReviewId: 'root-1',
            threadId: 'root-1',
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });
      },
    ));

    // A thread repeats the attribution on every message, so the provider name
    // leaked once per reply as well. See GitHub issue #1308.
    it('attributes the reply to the profile display name, not the provider name', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        const addDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

        await service.saveReply({
          review: 'Thanks!',
          biteId: 'biteId123',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        });

        expect(addDocumentSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              author: 'El Mo',
              authorId: '123',
            }),
          }),
        );
      },
    ));

    it('reloads the compartment so the reply renders without a reload', inject(
      [ReviewApiService],
      async (service: ReviewApiService) => {
        jest
          .spyOn(FirebaseFirestore, 'addDocument')
          .mockResolvedValue({} as any);

        await service.saveReply({
          review: 'Will do',
          biteId: 'biteId123',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        });

        expect(
          loadReviewsByBiteIdUtils.loadReviewsByBiteId,
        ).toHaveBeenCalledWith('biteId123');
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

          try {
            await service.saveReply({
              review: 'Will do',
              biteId: 'biteId123',
              parentReviewId: 'root-1',
              threadId: 'root-1',
            });
          } catch {
            // Swallow the error for test
          }

          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error saving review reply:',
            expect.any(Error),
          );
        },
      ));
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { ContentRefusedError } from 'utils';
import { AuthService } from 'ta-firestore';
import { ReviewApiService } from '../review-api.service';
import * as loadReviewsByBiteIdUtils from '../utils/load-review-by-bite-id';

jest.mock('../utils/load-review-by-bite-id', () => ({
  loadReviewsByBiteId: jest.fn().mockResolvedValue([]),
}));

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;
const loadReviews = loadReviewsByBiteIdUtils.loadReviewsByBiteId as jest.Mock;

/** The signed-in reader the service hands to every read (issue #2118). */
let user: { uid: string } | null = null;

/**
 * Reviews are written by the `saveReview` and `editReview` callables, which
 * check the text first (issue #1610). The author's name and the timestamps
 * are the backend's now, so the client sends only what the user wrote and
 * where it belongs.
 */
describe(ReviewApiService.name, () => {
  let service: ReviewApiService;

  beforeEach(() => {
    callByName.mockReset();
    callByName.mockResolvedValue({
      data: { status: 'saved', reviewId: 'review-1' },
    });
    loadReviews.mockClear();
    loadReviews.mockResolvedValue([{ id: 'review-1' }]);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getUser: (): typeof user => user },
        },
      ],
    });
    service = TestBed.inject(ReviewApiService);
  });

  it('reads the reviews of a Bite', async () => {
    await service.reviewsByBiteId('bite-1');

    expect(loadReviews).toHaveBeenCalledWith('bite-1', undefined);
  });

  it('reads as the signed-in reader, so their hidden items show them their text', async () => {
    user = { uid: 'mira' };

    await service.reviewsByBiteId('bite-1');

    expect(loadReviews).toHaveBeenCalledWith('bite-1', 'mira');
    user = null;
  });

  describe('saveNewReview', () => {
    it('sends the text to saveReview and answers with the reloaded reviews', async () => {
      await expect(
        service.saveNewReview({ review: 'Lovely', biteId: 'bite-1' }),
      ).resolves.toEqual([{ id: 'review-1' }]);

      expect(callByName).toHaveBeenCalledWith({
        name: 'saveReview',
        data: { review: 'Lovely', biteId: 'bite-1' },
      });
      expect(loadReviews).toHaveBeenCalledWith('bite-1', undefined);
    });

    it('throws a refusal, and reloads nothing', async () => {
      callByName.mockResolvedValue({ data: { status: 'refused' } });

      await expect(
        service.saveNewReview({ review: 'x', biteId: 'bite-1' }),
      ).rejects.toBeInstanceOf(ContentRefusedError);
      expect(loadReviews).not.toHaveBeenCalled();
    });

    it('takes an answer without data as saved', async () => {
      callByName.mockResolvedValue({ data: undefined });

      await expect(
        service.saveNewReview({ review: 'Lovely', biteId: 'bite-1' }),
      ).resolves.toEqual([{ id: 'review-1' }]);
    });

    it('throws when the call fails', async () => {
      callByName.mockRejectedValue(new Error('offline'));

      await expect(
        service.saveNewReview({ review: 'Lovely', biteId: 'bite-1' }),
      ).rejects.toThrow('offline');
    });
  });

  describe('saveReply', () => {
    it('sends the thread with the text', async () => {
      await service.saveReply({
        review: 'Agreed',
        biteId: 'bite-1',
        parentReviewId: 'root-1',
        threadId: 'root-1',
      });

      expect(callByName).toHaveBeenCalledWith({
        name: 'saveReview',
        data: {
          review: 'Agreed',
          biteId: 'bite-1',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        },
      });
    });

    it('throws a refusal', async () => {
      callByName.mockResolvedValue({ data: { status: 'refused' } });

      await expect(
        service.saveReply({
          review: 'x',
          biteId: 'bite-1',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        }),
      ).rejects.toBeInstanceOf(ContentRefusedError);
    });
  });

  describe('updateReview', () => {
    it('sends only the review and its new text to editReview', async () => {
      await expect(
        service.updateReview({
          reviewId: 'review-1',
          biteId: 'bite-1',
          review: 'Better',
        }),
      ).resolves.toEqual([{ id: 'review-1' }]);

      expect(callByName).toHaveBeenCalledWith({
        name: 'editReview',
        data: { reviewId: 'review-1', review: 'Better' },
      });
      expect(loadReviews).toHaveBeenCalledWith('bite-1', undefined);
    });

    it('throws a refusal', async () => {
      callByName.mockResolvedValue({ data: { status: 'refused' } });

      await expect(
        service.updateReview({
          reviewId: 'review-1',
          biteId: 'bite-1',
          review: 'x',
        }),
      ).rejects.toBeInstanceOf(ContentRefusedError);
    });
  });

  /** Issue #2116: the callable decides between deleting and a tombstone. */
  describe('deleteReview', () => {
    it('sends only the review id to deleteReview, then reloads the Bite', async () => {
      callByName.mockResolvedValue({ data: { status: 'tombstoned' } });

      await expect(
        service.deleteReview({ reviewId: 'review-1', biteId: 'bite-1' }),
      ).resolves.toEqual([{ id: 'review-1' }]);

      expect(callByName).toHaveBeenCalledWith({
        name: 'deleteReview',
        data: { reviewId: 'review-1' },
      });
      expect(loadReviews).toHaveBeenCalledWith('bite-1', undefined);
    });

    it('rejects when the callable refuses', async () => {
      callByName.mockRejectedValue(new Error('permission-denied'));

      await expect(
        service.deleteReview({ reviewId: 'review-1', biteId: 'bite-1' }),
      ).rejects.toThrow('permission-denied');
      expect(loadReviews).not.toHaveBeenCalled();
    });
  });

  /** Issue #2117: a report changes nothing on screen, so nothing reloads. */
  describe('reportReview', () => {
    it('sends the review and the reason to reportReview and answers with its result', async () => {
      callByName.mockResolvedValue({ data: { reported: true } });

      await expect(
        service.reportReview('reply-1', 'harassment'),
      ).resolves.toEqual({ reported: true });

      expect(callByName).toHaveBeenCalledWith({
        name: 'reportReview',
        data: { reviewId: 'reply-1', reason: 'harassment' },
      });
      expect(loadReviews).not.toHaveBeenCalled();
    });

    it('rejects when the call fails', async () => {
      callByName.mockRejectedValue(new Error('unavailable'));

      await expect(service.reportReview('reply-1', 'spam')).rejects.toThrow(
        'unavailable',
      );
    });
  });
});

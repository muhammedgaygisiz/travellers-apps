import { inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { loadReviewsByBiteId } from './utils/load-review-by-bite-id';
import { ReportReviewResult, Review, ReviewReportReason } from 'model';
import { ContentRefusedError } from 'utils';

type SaveReviewResponse =
  { status: 'saved'; reviewId: string } | { status: 'refused' };

type DeleteReviewResponse = { status: 'deleted' | 'tombstoned' };

/**
 * Reviews and replies are written by the `saveReview` and `editReview`
 * callables, and withdrawn by `deleteReview` (issue #2116), rather than
 * straight to Firestore (issue #1610): the backend
 * checks the text before any other account can read it, and the rules refuse
 * a client write. A refusal arrives as an answer, and is thrown here as a
 * {@link ContentRefusedError} so the page can say what happened.
 *
 * Every write throws when it does not land, so the caller can tell the user
 * and keep the reviews on screen as they were.
 */
@Injectable({ providedIn: 'root' })
export class ReviewApiService {
  private readonly authService = inject(AuthService);

  /**
   * Every read carries the signed-in reader, so their own hidden items can
   * show them what was hidden (issue #2118).
   */
  private load(biteId: string): Promise<Review[]> {
    return loadReviewsByBiteId(biteId, this.authService.getUser()?.uid);
  }

  reviewsByBiteId(biteId: string): Promise<Review[]> {
    return this.load(biteId);
  }

  async saveNewReview(payload: {
    review: string;
    biteId: string;
  }): Promise<Review[]> {
    await this.call('saveReview', payload);

    return this.load(payload.biteId);
  }

  /**
   * Answers a review inside its thread.
   *
   * A reply is an ordinary review document with `parentReviewId` and `threadId`
   * set, so the Bite still needs exactly one query to read its whole review
   * compartment and the grouping into threads happens on the client. The
   * backend tells a reply apart from a root review by `parentReviewId` alone
   * (issue #1283).
   */
  async saveReply(payload: {
    review: string;
    biteId: string;
    parentReviewId: string;
    threadId: string;
  }): Promise<Review[]> {
    await this.call('saveReview', payload);

    return this.load(payload.biteId);
  }

  /**
   * Replaces the text of the signed-in user's own review or reply (issue #721).
   * Only the text and the two `updatedAt` fields change, so the review cannot
   * leave its Bite or its thread, and ordering stays on `createdAtTimestamp`.
   */
  async updateReview(payload: {
    reviewId: string;
    biteId: string;
    review: string;
  }): Promise<Review[]> {
    await this.call('editReview', {
      reviewId: payload.reviewId,
      review: payload.review,
    });

    return this.load(payload.biteId);
  }

  /**
   * Withdraws the signed-in user's own review or reply (issue #2116). The
   * `deleteReview` callable decides what that means: an item nobody answered
   * is removed, and one somebody answered stays as a tombstone so their reply
   * keeps its place. The rules refuse a client delete, because only the
   * backend can see whether anybody answered.
   */
  async deleteReview(payload: {
    reviewId: string;
    biteId: string;
  }): Promise<Review[]> {
    await FirebaseFunctions.callByName<
      Record<string, string>,
      DeleteReviewResponse
    >({ name: 'deleteReview', data: { reviewId: payload.reviewId } });

    return this.load(payload.biteId);
  }

  /**
   * Reports somebody else's review or reply to the BiteTribe operators
   * (issue #2117). Nothing in the compartment changes, so nothing is reloaded.
   * Errors are not swallowed: a reporter told their report went through when
   * it did not will not file it again.
   */
  async reportReview(
    reviewId: string,
    reason: ReviewReportReason,
  ): Promise<ReportReviewResult> {
    const result = await FirebaseFunctions.callByName<
      { reviewId: string; reason: ReviewReportReason },
      ReportReviewResult
    >({ name: 'reportReview', data: { reviewId, reason } });

    return result.data;
  }

  private async call(
    name: 'saveReview' | 'editReview',
    data: Record<string, string>,
  ): Promise<void> {
    const result = await FirebaseFunctions.callByName<
      Record<string, string>,
      SaveReviewResponse
    >({ name, data });

    if (result.data?.status === 'refused') {
      throw new ContentRefusedError('review');
    }
  }
}

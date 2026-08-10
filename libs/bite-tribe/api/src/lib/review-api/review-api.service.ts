import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION, REVIEW_COLLECTION } from '../utils/constants';
import { loadReviewsByBiteId } from './utils/load-review-by-bite-id';
import { loadDisplayNameById } from './utils/load-display-names-by-id';
import { Review } from 'model';

@Injectable({ providedIn: 'root' })
export class ReviewApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  reviewsByBiteId(biteId: string): Promise<Review[]> {
    return loadReviewsByBiteId(biteId);
  }

  async saveNewReview(payload: {
    review: string;
    biteId: string;
  }): Promise<Review[]> {
    try {
      const user = this.authService.getUser();
      const author = await this.authorName(user?.uid);

      await FirebaseFirestore.addDocument({
        reference: REVIEW_COLLECTION,
        data: {
          review: payload.review,
          biteId: `/${BITE_COLLECTION}/${payload.biteId}`,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
          authorId: user?.uid || '',
          author,
        },
      });

      return loadReviewsByBiteId(payload.biteId);
    } catch (error) {
      console.error('Error saving new review:', error);
      this.errorHandler.handleError(error);

      return <Review[]>[];
    }
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
    try {
      const user = this.authService.getUser();
      const author = await this.authorName(user?.uid);

      await FirebaseFirestore.addDocument({
        reference: REVIEW_COLLECTION,
        data: {
          review: payload.review,
          biteId: `/${BITE_COLLECTION}/${payload.biteId}`,
          parentReviewId: payload.parentReviewId,
          threadId: payload.threadId,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
          authorId: user?.uid || '',
          author,
        },
      });

      return loadReviewsByBiteId(payload.biteId);
    } catch (error) {
      console.error('Error saving review reply:', error);
      this.errorHandler.handleError(error);

      return <Review[]>[];
    }
  }

  /**
   * The name a review is written under.
   *
   * Read from the user's profile rather than from the Firebase Auth user: the
   * latter's `displayName` is whatever Google or Apple knows the person as,
   * which is their legal name, and publishing it defeated the display name the
   * product asks for during onboarding (issue #1308).
   *
   * The stored name is still written, so a reader that has not resolved the
   * author yet has something to show, but it is now the same name the read
   * path resolves. An account with no readable profile writes an empty author
   * instead of falling back to the provider's name — the whole point is that
   * the provider's name never reaches a review document.
   */
  private async authorName(uid: string | undefined): Promise<string> {
    return (await loadDisplayNameById(uid || '')) || '';
  }
}

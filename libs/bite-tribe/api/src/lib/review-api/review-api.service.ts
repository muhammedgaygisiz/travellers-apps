import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION, REVIEW_COLLECTION } from '../utils/constants';
import { loadReviewsByBiteId } from './utils/load-review-by-bite-id';
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

      await FirebaseFirestore.addDocument({
        reference: REVIEW_COLLECTION,
        data: {
          review: payload.review,
          biteId: `/${BITE_COLLECTION}/${payload.biteId}`,
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
          authorId: user?.uid || '',
          author: user?.displayName || '',
        },
      });

      return loadReviewsByBiteId(payload.biteId);
    } catch (error) {
      console.error('Error saving new review:', error);
      this.errorHandler.handleError(error);

      return <Review[]>[];
    }
  }
}

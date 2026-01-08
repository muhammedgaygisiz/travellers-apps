import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  Observable,
  skipWhile,
  Subject,
  switchMap,
} from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { BITE_COLLECTION } from './bite-api/utils/constants';

const REVIEW_COLLECTION = 'reviews';

@Injectable({ providedIn: 'root' })
export class ReviewApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly reviewsChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();

  private async startReviewListener(biteId: string): Promise<void> {
    // console.debug('#mo Fetching reviews from Firestore');

    await FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: REVIEW_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'biteId',
              opStr: '==',
              value: `/${BITE_COLLECTION}/${biteId}`,
            },
          ],
        },
      },
      (docs) => {
        // console.debug('#mo Fetched reviews from Firestore', docs);

        const reviews =
          docs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.reviewsChannel$.next(reviews);
      },
    );
  }

  reviewsByBiteId(biteId: string): Observable<any[]> {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        // console.debug('#mo - Start Listener for Reviews');
        this.startReviewListener(biteId);

        return this.reviewsChannel$;
      }),
    );
  }

  async saveNewReview(payload: {
    review: string;
    biteId: string;
  }): Promise<void> {
    try {
      const user = await this.getUser();

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
    } catch (error) {
      console.error('Error saving new review:', error);
      this.errorHandler.handleError(error);
    }
  }

  private async getUser(): Promise<User | null | undefined> {
    const authState = await this.authService.authState();
    return authState?.user;
  }
}

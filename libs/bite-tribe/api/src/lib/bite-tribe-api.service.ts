import { inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  BehaviorSubject,
  EMPTY,
  from,
  pipe,
  skipWhile,
  switchMap,
  tap,
} from 'rxjs';
import { AuthService } from 'ta-firestore';
import { Restaurant } from 'model';

const BITE_COLLECTION = 'bites';
const REVIEW_COLLECTION = 'reviews';
const RESTAURANT_COLLECTION = 'restaurants';

const clearListeners = () =>
  pipe(
    tap((isLoggedIn) => {
      if (!isLoggedIn) {
        FirebaseFirestore.removeAllListeners();
      }
    })
  );

@Injectable({
  providedIn: 'root',
})
export class BiteTribeApiService {
  private readonly authService = inject(AuthService);

  private readonly bitesChannel$ = new BehaviorSubject<any[]>([]);
  likesChannel$ = new BehaviorSubject<any[]>([]);
  private readonly reviewsChannel$ = new BehaviorSubject<any[]>([]);

  public allBites$ = this.authService.isLoggedIn$.pipe(
    clearListeners(),
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      console.log('#mo - Start Listener for Bites');
      this.startBitesListener();

      return this.bitesChannel$;
    })
  );

  private async startBitesListener() {
    console.log('#mo Fetching bites from Firestore');

    await FirebaseFirestore.addCollectionSnapshotListener(
      { reference: BITE_COLLECTION },
      async (biteDocs) => {
        console.log('#mo Fetched bites from Firestore', biteDocs);

        const bites =
          biteDocs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
            likes: [],
          })) || [];

        bites.forEach((bite) => this.startLikesListener(bite));

        this.bitesChannel$.next(bites);
      }
    );
  }

  private startLikesListener(bite: {
    [p: string]: any;
    id: string;
    likes: any[];
  }) {
    FirebaseFirestore.addCollectionSnapshotListener(
      { reference: `${BITE_COLLECTION}/${bite.id}/likes` },
      (likeDocs: any) => {
        const likes =
          likeDocs?.snapshots.map((likeDoc: any) => ({
            ...likeDoc.data,
          })) || [];

        this.likesChannel$.next(likes);
      }
    );
  }

  saveNewBite(bite: any) {
    FirebaseFirestore.addDocument({
      reference: BITE_COLLECTION,
      data: {
        ...bite,
      },
    });
  }

  async saveTagsToExistingBite(payload: { newTags: string[]; id: string }) {
    try {
      // First get the current document
      const doc = await FirebaseFirestore.getDocument({
        reference: `${BITE_COLLECTION}/${payload.id}`,
      });

      const data = doc.snapshot.data;
      // Combine existing and new tags, removing duplicates
      const existingTags = data && (data['tags'] || []);
      const uniqueTags = [...new Set([...existingTags, ...payload.newTags])];

      // Update the document with merged tags
      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${payload.id}`,
        data: {
          tags: uniqueTags,
        },
      });
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  }

  async saveNewReview(payload: { review: string; biteId: string }) {
    const user = await this.getUser();

    const addDocumentResult = await FirebaseFirestore.addDocument({
      reference: REVIEW_COLLECTION,
      data: {
        review: payload.review,
        biteId: `/${BITE_COLLECTION}/${payload.biteId}`,
        createdAt: new Date().toISOString(),
        author: user?.uid || '',
      },
    });

    console.log('#mo', addDocumentResult);
  }

  private async startReviewListener(biteId: string) {
    console.log('#mo Fetching reviews from Firestore');

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
        console.log('#mo Fetched reviews from Firestore', docs);

        const reviews =
          docs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.reviewsChannel$.next(reviews);
      }
    );
  }

  async saveLike(like: {
    likeType: string;
    biteId: string;
    createdAt: string;
  }) {
    try {
      const user = await this.getUser();

      FirebaseFirestore.setDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${user?.uid}`,
        data: {
          ...like,
          userId: user?.uid,
        },
      });
    } catch (error) {
      console.error('Error saving like:', error);
    }
  }

  private async getUser() {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  async removeLike(like: any) {
    try {
      const user = await this.getUser();
      const uid = user?.uid;

      await FirebaseFirestore.deleteDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${uid}`,
      });

      return { ...like, userId: uid };
    } catch (e) {
      console.error('Error removing like:', e);
    }
  }

  reviewsByBiteId(biteId: string) {
    return this.authService.isLoggedIn$.pipe(
      clearListeners(),
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        console.log('#mo - Start Listener for Reviews');
        this.startReviewListener(biteId);

        return this.reviewsChannel$;
      })
    );
  }

  loadRestaurant(restaurantId: string) {
    return this.authService.isLoggedIn$.pipe(
      clearListeners(),
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        console.log('#mo - Start Listener for Restaurant');
        if (restaurantId) {
          return from(this.getRestaurantById(restaurantId));
        }

        return EMPTY;
      })
    );
  }

  private async getRestaurantById(restaurantId: string) {
    const doc = await FirebaseFirestore.getDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
    });

    const data = doc.snapshot.data;
    return {
      id: data?.['id'] || restaurantId,
      ...data,
    } as Restaurant;
  }
}

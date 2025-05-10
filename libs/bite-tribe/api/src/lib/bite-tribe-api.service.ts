import { inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BehaviorSubject, pipe, skipWhile, switchMap, tap } from 'rxjs';
import { AuthService } from 'ta-firestore';

const BITE_COLLECTION = 'bites';
const REVIEW_COLLECTION = 'reviews';

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
      (docs) => {
        console.log('#mo Fetched bites from Firestore', docs);

        const bites =
          docs?.snapshots.map((doc) => ({
            ...doc.data,
            id: doc.id,
          })) || [];

        this.bitesChannel$.next(bites);
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
      const doc = await FirebaseFirestore.getDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}`,
      });

      const data = doc.snapshot.data;
      const currentCountByLikeType = data && (data[like.likeType] || 0);
      const increasedCountByLikeType = currentCountByLikeType + 1;

      const user = await this.getUser();
      const currentLikes = data && (data['likes'] || []);

      // eslint-disable-next-line no-unused-vars
      const { biteId, ...likeToSave } = like;

      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}`,
        data: {
          [like.likeType]: increasedCountByLikeType,
          likes: [...currentLikes, { ...likeToSave, userId: user?.uid }],
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
      const doc = await FirebaseFirestore.getDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}`,
      });

      const data = doc.snapshot.data;
      const currentCountByLikeType = data && (data[like.likeType] || 0);
      const decreasedCountByLikeType = currentCountByLikeType - 1;

      const user = await this.getUser();
      const currentLikes = data && (data['likes'] || []);

      const filteredLiked = currentLikes.filter(
        (curr: any) =>
          curr.userId !== user?.uid ||
          (curr.userId === user?.uid && curr.likeType !== like.likeType)
      );

      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}`,
        data: {
          [like.likeType]: decreasedCountByLikeType,
          likes: [...filteredLiked],
        },
      });
    } catch (e) {
      console.error('Error removing like:', e);
    }
  }
}

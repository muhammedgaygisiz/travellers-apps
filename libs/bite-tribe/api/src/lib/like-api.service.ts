import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from './bite-api.service';

const LIKES_COLLECTION_GROUP = 'likes';

@Injectable({ providedIn: 'root' })
export class LikeApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly likesChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  likesCallbackId = '';

  public allLikes$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startLikesListener();
      } else {
        this.stopLikesListener(this.likesCallbackId);
      }

      return this.likesChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async startLikesListener() {
    this.likesCallbackId =
      await FirebaseFirestore.addCollectionGroupSnapshotListener(
        { reference: `${LIKES_COLLECTION_GROUP}` },
        (likeDocs: any) => {
          const likes =
            likeDocs?.snapshots.map((likeDoc: any) => ({
              ...likeDoc.data,
            })) || [];

          if (likes.length) {
            this.likesChannel$.next(likes);
          }
        }
      );
  }

  private async stopLikesListener(callbackId: string) {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveLike(like: {
    likeType: string;
    biteId: string;
    createdAt: string;
  }) {
    try {
      const user = await this.getUser();

      await FirebaseFirestore.setDocument({
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
      this.errorHandler.handleError(e);
    }
  }
}

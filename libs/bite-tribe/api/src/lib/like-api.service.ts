import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { BehaviorSubject, skip, Subject } from 'rxjs';
import {
  AddCollectionGroupSnapshotListenerCallbackEvent,
  DocumentData,
  FirebaseFirestore,
} from '@capacitor-firebase/firestore';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { BITE_COLLECTION } from './utils/constants';

const LIKES_COLLECTION_GROUP = 'likes';

@Injectable({ providedIn: 'root' })
export class LikeApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly _likesChannel$ = new BehaviorSubject<any[]>([]);
  likes$ = this._likesChannel$.asObservable().pipe(skip(1));

  private readonly stopped$ = new Subject<void>();
  likesCallbackId = '';

  public async startListener(): Promise<void> {
    this.likesCallbackId =
      await FirebaseFirestore.addCollectionGroupSnapshotListener(
        { reference: `${LIKES_COLLECTION_GROUP}` },
        (likeDocs) => this.handleResponse(likeDocs),
      );
  }

  handleResponse(
    likeDocs: AddCollectionGroupSnapshotListenerCallbackEvent<DocumentData> | null,
  ): void {
    const likes =
      likeDocs?.snapshots.map((likeDoc: any) => ({
        ...likeDoc.data,
      })) || [];

    if (likes.length) {
      this._likesChannel$.next(likes);
    }
  }

  async stopLikesListener(callbackId: string): Promise<void> {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveLike(like: {
    likeType: string;
    biteId: string;
    createdAt: string;
  }): Promise<void> {
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

  private async getUser(): Promise<User | null | undefined> {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  async removeLike(like: any): Promise<void> {
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

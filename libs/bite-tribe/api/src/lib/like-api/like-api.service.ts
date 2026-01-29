import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from '../utils/constants';
import { Bite, Like } from 'model';
import { loadLikesByBites } from './utils/load-likes-by-bites';

@Injectable({ providedIn: 'root' })
export class LikeApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  loadLikesForBites(bites: Bite[]): Promise<Like[]> {
    return loadLikesByBites(bites);
  }

  async saveLike(like: {
    likeType: string;
    biteId: string;
    createdAt: string;
  }): Promise<Like | undefined> {
    try {
      const user = this.authService.getUser();

      await FirebaseFirestore.setDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${user?.uid}`,
        data: {
          ...like,
          userId: user?.uid,
        },
      });

      const result = await FirebaseFirestore.getDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${user?.uid}`,
      });

      return result.snapshot.data as Like;
    } catch (error) {
      console.error('Error saving like:', error);
      this.errorHandler.handleError(error);
      return undefined;
    }
  }

  async removeLike(like: Like): Promise<Like> {
    const user = this.authService.getUser();
    const uid = user?.uid;

    if (!uid) {
      throw new Error('User not authenticated');
    }

    try {
      await FirebaseFirestore.deleteDocument({
        reference: `${BITE_COLLECTION}/${like.biteId}/likes/${uid}`,
      });

      return {
        ...like,
        userId: uid,
      };
    } catch (error) {
      console.error('Error removing like:', error);
      this.errorHandler.handleError(error);
      return Promise.reject(error);
    }
  }
}

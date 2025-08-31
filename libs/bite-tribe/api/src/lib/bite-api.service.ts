import { ErrorHandler, inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';

export const BITE_COLLECTION = 'bites';

@Injectable({ providedIn: 'root' })
export class BiteApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly bitesChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  bitesCallbackId = '';

  public allBites$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startBitesListener();
      } else {
        this.stopBitesListener(this.bitesCallbackId);
      }

      return this.bitesChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async startBitesListener(): Promise<void> {
    this.bitesCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        { reference: BITE_COLLECTION },
        async (biteDocs) => {
          // console.debug('#mo Fetched bites from Firestore', biteDocs);

          const bites =
            biteDocs?.snapshots.map((doc) => ({
              ...doc.data,
              id: doc.id,
              likes: [],
            })) || [];

          this.bitesChannel$.next(bites);
        }
      );
  }

  private async stopBitesListener(callbackId: string): Promise<void> {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  async saveNewBite(bite: Bite): Promise<void> {
    try {
      const user = this.getUser();

      await FirebaseFirestore.addDocument({
        reference: BITE_COLLECTION,
        data: {
          ...bite,
          userId: user?.uid || '',
          createdAt: new Date().toISOString(),
          createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error saving new bite:', error);
      this.errorHandler.handleError(error);
    }
  }

  private getUser(): User | null | undefined {
    const authState = this.authService.authState();
    return authState?.user;
  }

  async saveEditedBite(bite: Bite): Promise<void> {
    try {
      await FirebaseFirestore.updateDocument({
        reference: `${BITE_COLLECTION}/${bite.id}`,
        data: {
          ...bite,
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error saving edited bite:', error);
      this.errorHandler.handleError(error);
    }
  }

  async saveTagsToExistingBite(payload: {
    newTags: string[];
    id: string;
  }): Promise<void> {
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
          updatedAt: new Date().toISOString(),
          updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
        },
      });
    } catch (error) {
      console.error('Error updating tags:', error);
      this.errorHandler.handleError(error);
    }
  }

  async deleteBite(bite: any): Promise<void> {
    try {
      if (bite.id) {
        await FirebaseFirestore.deleteDocument({
          reference: `${BITE_COLLECTION}/${bite.id}`,
        });
      }
    } catch (error) {
      console.error('Error deleting bite:', error);
      this.errorHandler.handleError(error);
    }
  }
}

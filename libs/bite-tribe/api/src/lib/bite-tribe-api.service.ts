import { inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BehaviorSubject, debounceTime, filter, switchMap } from 'rxjs';
import { AuthService } from 'ta-firestore';

const BITE_COLLECTION = 'bites';

@Injectable({
  providedIn: 'root',
})
export class BiteTribeApiService {
  private readonly authService = inject(AuthService);

  private readonly bitesChannel$ = new BehaviorSubject<any[]>([]);

  private bitesCallbackId = '';

  public allBites$ = this.authService.isLoggedIn$.pipe(
    filter((isLoggedIn) => isLoggedIn),
    debounceTime(500),
    switchMap(() => {
      this.startBitesListener();

      return this.bitesChannel$;
    })
  );

  private async startBitesListener() {
    console.log('#mo Fetching bites from Firestore');

    this.bitesCallbackId =
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
}

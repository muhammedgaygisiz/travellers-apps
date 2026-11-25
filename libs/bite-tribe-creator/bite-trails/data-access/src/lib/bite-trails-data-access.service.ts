import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTrail } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { resourceValue } from 'utils';

export const BITE_TRAIL_COLLECTION = 'biteTrails';

/**
 * The BiteTrails the signed-in account owns, read for the Bite Creator app's
 * home page (issue #2130). Moved out of the business dashboard with the rest
 * of BiteTrail creation; the read itself is unchanged.
 */
@Injectable({ providedIn: 'root' })
export class BiteTrailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  // Scoped to the signed-in account: a BiteTrail is owned by the user who
  // created it, now that the organisation concept is gone (issue #1371).
  biteTrailsLoader: ResourceLoader<
    BiteTrail[] | undefined,
    { userId: string | undefined }
  > = async ({ params }) => {
    const { userId } = params;

    if (!userId) {
      return [];
    }

    const docs = await FirebaseFirestore.getCollection({
      reference: BITE_TRAIL_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'ownerId',
            opStr: '==',
            value: userId,
          },
        ],
      },
    });

    if (!docs?.snapshots?.length) {
      return [];
    }

    return docs.snapshots.map(
      (doc) => ({ ...doc.data, id: doc.id }) as BiteTrail,
    );
  };

  biteTrails = resource({
    params: () => ({ userId: this.storeService.user()?.uid }),
    loader: this.biteTrailsLoader.bind(this),
  });

  /** Read guarded: `value()` throws once a read has failed (#1232). */
  biteTrailsValue = resourceValue(this.biteTrails, [] as BiteTrail[]);

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  logout(): void {
    this.storeService.logout();
  }
}

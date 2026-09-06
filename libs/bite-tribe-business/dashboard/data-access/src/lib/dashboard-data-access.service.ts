import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTrail, Restaurant } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { resourceValue } from 'utils';

export const RESTAURANT_COLLECTION = 'restaurants';
export const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({
  providedIn: 'root',
})
export class DashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  restaurantsLoader: ResourceLoader<Restaurant[] | undefined, unknown> =
    async () => {
      const docs = await FirebaseFirestore.getCollection({
        reference: RESTAURANT_COLLECTION,
      });

      if (!docs?.snapshots) {
        return [];
      }

      return docs.snapshots.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data,
          }) as Restaurant,
      );
    };

  restaurants = resource({
    loader: this.restaurantsLoader.bind(this),
  });

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

  // Both of these read Firestore and can reject. `value()` throws in that
  // state, and the pages bind them directly, so one failed collection read
  // would otherwise take the whole binding update with it. See issue #1232.
  restaurantsValue = resourceValue(this.restaurants, [] as Restaurant[]);
  biteTrailsValue = resourceValue(this.biteTrails, [] as BiteTrail[]);

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  gpsPosition = toSignal(this.storeService.position$);

  logout(): void {
    this.storeService.logout();
  }
}

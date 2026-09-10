import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTrail, Restaurant } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { resourceValue } from 'utils';

export const RESTAURANT_COLLECTION = 'restaurants';
/** The field naming the account a restaurant is assigned to (issue #1074). */
export const RESTAURANT_OWNER_FIELD = 'ownerUserId';
export const BITE_TRAIL_COLLECTION = 'biteTrails';

@Injectable({
  providedIn: 'root',
})
export class DashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  /**
   * The restaurants assigned to the signed-in account, and nothing else.
   *
   * This read used to return the whole collection, which made the business app
   * a view over every restaurant in BiteTribe: an account was listed - and
   * could open the edit form of - a restaurant assigned to somebody else
   * (issue #1079). Ownership is `Restaurant.ownerUserId`, written by the
   * operator callables of issue #1077, and the same field issue #1078's rules
   * authorise a write from. The filter is strict and has no fallback to the
   * unowned restaurants: an account holding nothing sees nothing, which is the
   * empty state the restaurants page renders.
   *
   * Filtering here rather than after the read is what keeps this honest once
   * the rules narrow reads too. Until they do, the rules still allow any
   * signed-in account to read any restaurant, so this is the visible boundary
   * rather than the enforced one - the enforced one is the route guard and the
   * write rules.
   */
  restaurantsLoader: ResourceLoader<
    Restaurant[] | undefined,
    { userId: string | undefined }
  > = async ({ params }) => {
    const { userId } = params;

    if (!userId) {
      return [];
    }

    const docs = await FirebaseFirestore.getCollection({
      reference: RESTAURANT_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: RESTAURANT_OWNER_FIELD,
            opStr: '==',
            value: userId,
          },
        ],
      },
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

  /**
   * Keyed on the uid, so an assignment or a revocation lands on the next load
   * without a re-login: ownership is a document field rather than a custom
   * claim, so there is no token to refresh (issue #1069).
   */
  restaurants = resource({
    params: () => ({ userId: this.storeService.user()?.uid }),
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

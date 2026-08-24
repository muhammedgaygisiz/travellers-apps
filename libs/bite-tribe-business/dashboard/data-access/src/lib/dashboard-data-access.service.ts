import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Restaurant, RestaurantCandidate } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { resourceValue } from 'utils';

export const RESTAURANT_COLLECTION = 'restaurants';
export const BITE_COLLECTION = 'bites';
export const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';
export const DASHBOARD_RESTAURANT_CANDIDATES_LIMIT = 5;

export interface DashboardRestaurantCandidate extends RestaurantCandidate {
  bites: Bite[];
}

const toRestaurantCandidate = (doc: {
  id: string;
  data: unknown;
}): RestaurantCandidate =>
  ({
    id: doc.id,
    ...(doc.data as Record<string, unknown>),
  }) as RestaurantCandidate;

const toBite = (doc: { id: string; data: unknown }): Bite =>
  ({
    id: doc.id,
    ...(doc.data as Record<string, unknown>),
  }) as Bite;

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

  bitePlacesLoader: ResourceLoader<string[] | undefined, unknown> =
    async () => {
      const docs = await FirebaseFirestore.getCollection({
        reference: BITE_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'restaurantId',
              opStr: '==',
              value: '',
            },
          ],
        },
        queryConstraints: [
          {
            type: 'limit',
            limit: 10,
          },
        ],
      });

      if (!docs?.snapshots) {
        return [];
      }

      const places = docs.snapshots
        .map((doc) => (doc.data as Bite).place)
        .filter((place): place is string => !!place);

      return [...new Set(places)];
    };

  bitePlaces = resource({
    loader: this.bitePlacesLoader.bind(this),
  });

  restaurantCandidatesLoader: ResourceLoader<
    DashboardRestaurantCandidate[] | undefined,
    unknown
  > = async () => {
    const docs = await FirebaseFirestore.getCollection({
      reference: RESTAURANT_CANDIDATES_COLLECTION,
      compositeFilter: {
        type: 'and',
        queryConstraints: [
          {
            type: 'where',
            fieldPath: 'status',
            opStr: '==',
            value: 'pending',
          },
        ],
      },
      queryConstraints: [
        {
          type: 'limit',
          limit: DASHBOARD_RESTAURANT_CANDIDATES_LIMIT,
        },
      ],
    });

    if (!docs?.snapshots?.length) {
      return [];
    }

    const candidates = docs.snapshots.map(toRestaurantCandidate);
    const bitesById = await this.loadBitesById(
      candidates.flatMap((candidate) => candidate.biteIds ?? []),
    );

    return candidates.map((candidate) => ({
      ...candidate,
      bites: (candidate.biteIds ?? [])
        .map((biteId) => bitesById.get(biteId))
        .filter((bite): bite is Bite => !!bite),
    }));
  };

  restaurantCandidates = resource({
    loader: this.restaurantCandidatesLoader.bind(this),
  });

  // Every one of these reads Firestore and can reject. `value()` throws in that
  // state, and the dashboard binds all three in a row, so one failed collection
  // read used to take the whole page's binding update with it. See issue #1232.
  restaurantsValue = resourceValue(this.restaurants, [] as Restaurant[]);
  bitePlacesValue = resourceValue(this.bitePlaces, [] as string[]);
  restaurantCandidatesValue = resourceValue(
    this.restaurantCandidates,
    [] as DashboardRestaurantCandidate[],
  );

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  gpsPosition = toSignal(this.storeService.position$);

  logout(): void {
    this.storeService.logout();
  }

  selectRestaurantToCreate(restaurant: Restaurant): void {
    this.storeService.selectRestaurantToCreate(restaurant);
  }

  private async loadBitesById(biteIds: string[]): Promise<Map<string, Bite>> {
    const uniqueBiteIds = [...new Set(biteIds.filter(Boolean))];
    const biteDocs = await Promise.all(
      uniqueBiteIds.map((biteId) =>
        FirebaseFirestore.getDocument({
          reference: `${BITE_COLLECTION}/${biteId}`,
        }),
      ),
    );

    return biteDocs.reduce((result, doc) => {
      if (doc.snapshot?.data) {
        const bite = toBite(doc.snapshot);
        result.set(bite.id, bite);
      }

      return result;
    }, new Map<string, Bite>());
  }
}

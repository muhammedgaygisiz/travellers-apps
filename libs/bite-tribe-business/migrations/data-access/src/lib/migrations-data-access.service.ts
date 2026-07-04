import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceLoader,
} from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, RestaurantCandidate } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';
export const BITE_COLLECTION = 'bites';
export const RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT = 50;

const hasVerifiedRestaurant = (bite: Bite): boolean =>
  !!bite.restaurantId?.trim();

const hasValidPlace = (bite: Bite): boolean => !!bite.place?.trim();

const hasValidPosition = (bite: Bite): boolean => {
  const { latitude, longitude } = bite.position ?? {};

  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

const getActiveRestaurantCandidateBiteIds = (
  candidates: RestaurantCandidate[],
): Set<string> =>
  candidates.reduce((result, candidate) => {
    if (candidate.status !== 'pending') {
      return result;
    }

    candidate.biteIds?.forEach((biteId) => result.add(biteId));
    return result;
  }, new Set<string>());

export const getRestaurantClusteringEligibleBites = (
  bites: Bite[],
  restaurantCandidates: RestaurantCandidate[],
): Bite[] => {
  const activeCandidateBiteIds =
    getActiveRestaurantCandidateBiteIds(restaurantCandidates);

  return bites
    .filter((bite) => !hasVerifiedRestaurant(bite))
    .filter((bite) => !activeCandidateBiteIds.has(bite.id))
    .filter(hasValidPlace)
    .filter(hasValidPosition)
    .slice(0, RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT);
};

@Injectable({
  providedIn: 'root',
})
export class MigrationsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bites = toSignal(this.storeService.bites$, {
    initialValue: [] as Bite[],
  });

  activeRestaurantCandidatesLoader: ResourceLoader<
    RestaurantCandidate[] | undefined,
    any
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
    });

    if (!docs?.snapshots?.length) {
      return [];
    }

    return docs.snapshots.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data,
        }) as RestaurantCandidate,
    );
  };

  activeRestaurantCandidates = resource({
    loader: this.activeRestaurantCandidatesLoader.bind(this),
  });

  restaurantClusteringBitesLoader: ResourceLoader<Bite[] | undefined, any> =
    async () => {
      const docs = await FirebaseFirestore.getCollection({
        reference: BITE_COLLECTION,
      });

      if (!docs?.snapshots?.length) {
        return [];
      }

      return docs.snapshots.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data,
          }) as Bite,
      );
    };

  restaurantClusteringBites = resource({
    loader: this.restaurantClusteringBitesLoader.bind(this),
  });

  restaurantClusteringEligibleBites = computed(() =>
    getRestaurantClusteringEligibleBites(
      this.restaurantClusteringBites.value() ?? [],
      this.activeRestaurantCandidates.value() ?? [],
    ),
  );
}

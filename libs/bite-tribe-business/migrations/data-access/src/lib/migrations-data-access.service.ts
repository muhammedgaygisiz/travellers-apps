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
import { resourceValue } from 'utils';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

export const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';
export const BITE_COLLECTION = 'bites';
export const RESTAURANT_CLUSTERING_ELIGIBLE_BITES_LIMIT = 50;

export interface ClusterRestaurantCandidateForBiteRequest {
  biteId: string;
}

export interface ClusterRestaurantCandidateForBiteResult {
  candidateId?: string;
  verifiedRestaurantId?: string;
  evidenceCount: number;
  matchedBiteIds: string[];
  skippedCounts: {
    invalidPosition: number;
    verifiedBite: number;
    outsideRadius: number;
    nameMismatch: number;
  };
  status: 'created' | 'updated' | 'verified-restaurant-match';
}

export interface BackfillBiteAddressRequest {
  biteId: string;
}

export interface BackfillBiteAddressResult {
  biteId: string;
  status: 'resolved' | 'failed' | 'skipped';
}

/**
 * The store a release announcement is addressed to.
 *
 * The App Store and Google Play clear a review at different times, so the two
 * are announced separately rather than in one broadcast (issue #1194).
 */
export type ReleasePlatform = 'ios' | 'android';

export interface SendNewVersionNotificationRequest {
  platform: ReleasePlatform;
}

export interface SendNewVersionNotificationResult {
  platform: ReleasePlatform;
  /** Installations the announcement was addressed to. */
  tokenCount: number;
  /** Accounts scanned for those installations. */
  userCount: number;
}

/**
 * What a collection-wide backfill reports back.
 *
 * These mirror the result interfaces the callables return. The Functions app is
 * a separate build, so its types cannot be imported here — the same reason
 * every other callable on this page declares its own request and result shape.
 *
 * Every field is a count, which is what lets the page render any of them
 * without knowing which migration produced it.
 */
export type CollectionMigrationResult = Record<string, number>;

export interface BackfillReviewTimestampsResult extends CollectionMigrationResult {
  /** Every review document the migration looked at. */
  processed: number;
  /** Documents that gained a `createdAtTimestamp`. */
  filled: number;
  /** Documents that already had a usable one. */
  skipped: number;
  /** Documents with no `createdAt` the value could be derived from. */
  unresolvable: number;
}

export interface BackfillDisplayNameClaimsResult extends CollectionMigrationResult {
  processed: number;
  claimed: number;
  skipped: number;
  collisions: number;
}

const hasVerifiedRestaurant = (bite: Bite): boolean =>
  !!bite.restaurantId?.trim();

const hasValidPlace = (bite: Bite): boolean => !!bite.place?.trim();

const hasValidPosition = (bite: Bite): boolean => {
  const { latitude, longitude } = bite.position ?? {};

  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

export const getBitesNeedingAddressBackfill = (bites: Bite[]): Bite[] =>
  bites.filter((bite) => bite.addressStatus !== 'resolved');

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

  restaurantClusteringBitesLoader: ResourceLoader<Bite[] | undefined, unknown> =
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

  // Guarded reads: `value()` throws once a read has failed, and these computeds
  // feed the migrations page directly. See GitHub issue #1232.
  private readonly clusteringBitesValue = resourceValue(
    this.restaurantClusteringBites,
    [] as Bite[],
  );

  private readonly activeCandidatesValue = resourceValue(
    this.activeRestaurantCandidates,
    [] as RestaurantCandidate[],
  );

  restaurantClusteringEligibleBites = computed(() =>
    getRestaurantClusteringEligibleBites(
      this.clusteringBitesValue(),
      this.activeCandidatesValue(),
    ),
  );

  addressBackfillBites = computed(() =>
    getBitesNeedingAddressBackfill(this.clusteringBitesValue()),
  );

  async clusterRestaurantCandidateForBite(
    bite: Bite,
  ): Promise<ClusterRestaurantCandidateForBiteResult> {
    const result = await FirebaseFunctions.callByName<
      ClusterRestaurantCandidateForBiteRequest,
      ClusterRestaurantCandidateForBiteResult
    >({
      name: 'clusterRestaurantCandidateForBite',
      data: { biteId: bite.id },
    });

    this.activeRestaurantCandidates.reload();
    this.restaurantClusteringBites.reload();

    return result.data;
  }

  async backfillBiteAddress(bite: Bite): Promise<BackfillBiteAddressResult> {
    const result = await FirebaseFunctions.callByName<
      BackfillBiteAddressRequest,
      BackfillBiteAddressResult
    >({
      name: 'backfillBiteAddress',
      data: { biteId: bite.id },
    });

    this.restaurantClusteringBites.reload();

    return result.data;
  }

  /**
   * Gives every review the numeric `createdAtTimestamp` the threaded review
   * compartment sorts by, derived from the ISO `createdAt` the document already
   * carries (issue #1283).
   *
   * No resource is reloaded: this page shows Bites, and the migration touches
   * the `reviews` collection, which nothing here reads.
   */
  async backfillReviewTimestamps(): Promise<BackfillReviewTimestampsResult> {
    const result = await FirebaseFunctions.callByName<
      void,
      BackfillReviewTimestampsResult
    >({ name: 'backfillReviewTimestampsCallable' });

    return result.data;
  }

  /**
   * Claims every existing user's current display name, so uniqueness
   * enforcement can be switched on without locking existing users out of their
   * own name.
   */
  async backfillDisplayNameClaims(): Promise<BackfillDisplayNameClaimsResult> {
    const result = await FirebaseFunctions.callByName<
      void,
      BackfillDisplayNameClaimsResult
    >({ name: 'backfillDisplayNameClaimsCallable' });

    return result.data;
  }

  /**
   * Tells the installations of one store that a new app version is live.
   *
   * Nothing local changes, so no resource is reloaded here: the call is a
   * broadcast, and its only result worth showing is how far it reached.
   */
  async sendNewVersionNotification(
    platform: ReleasePlatform,
  ): Promise<SendNewVersionNotificationResult> {
    const result = await FirebaseFunctions.callByName<
      SendNewVersionNotificationRequest,
      SendNewVersionNotificationResult
    >({
      name: 'sendNewVersionNotification',
      data: { platform },
    });

    return result.data;
  }
}

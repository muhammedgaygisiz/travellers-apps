import {
  inject,
  Injectable,
  computed,
  resource,
  ResourceLoader,
} from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Bite, RestaurantCandidate } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import {
  dataUrlToBlob,
  getDownloadUrlFromFirebaseStorage,
  guessExtFromContentType,
  resourceValue,
} from 'utils';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { geohashForLocation } from 'geofire-common';
import { v4 as uuidv4 } from 'uuid';

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

  allBitesLoader: ResourceLoader<Bite[] | undefined, unknown> = async () => {
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

  allBites = resource({
    loader: this.allBitesLoader.bind(this),
  });

  // Guarded reads: `value()` throws once a read has failed, and these computeds
  // feed the migration surfaces directly. See GitHub issue #1232.
  /**
   * Every Bite in the collection.
   *
   * Read here rather than off the store: the store's Bite slice is filled by
   * the consumer app's home feed, which no operator app ever dispatches, so
   * reading it left the image and geohash surfaces permanently empty
   * (issue #1473).
   */
  readonly bites = resourceValue(this.allBites, [] as Bite[]);

  private readonly activeCandidatesValue = resourceValue(
    this.activeRestaurantCandidates,
    [] as RestaurantCandidate[],
  );

  restaurantClusteringEligibleBites = computed(() =>
    getRestaurantClusteringEligibleBites(
      this.bites(),
      this.activeCandidatesValue(),
    ),
  );

  addressBackfillBites = computed(() =>
    getBitesNeedingAddressBackfill(this.bites()),
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
    this.allBites.reload();

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

    this.allBites.reload();

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

  logout(): void {
    this.storeService.logout();
  }

  /**
   * Moves a Bite's inline base64 image into Storage and repoints the document
   * at the uploaded object.
   *
   * Lived in the page component until issue #1473 split that page into one
   * surface per migration; a Storage upload and a Firestore write are
   * data-access work, and duplicating them into a page component per surface
   * would have made that plain.
   */
  async migrateBiteImage(bite: Bite): Promise<void> {
    const { blob, contentType } = await dataUrlToBlob(bite.image);
    const ext = guessExtFromContentType(contentType);
    const objectPath = `images/${BITE_COLLECTION}/${bite.id}/${uuidv4()}.${ext}`;

    await FirebaseStorage.uploadFile(
      {
        path: objectPath,
        blob,
        metadata: {
          contentType: blob.type || 'application/octet-stream',
          cacheControl: 'public,max-age=31536000,immutable',
        },
      },
      async (event, error) => {
        if (error) {
          console.error('Failed to upload the migrated Bite image: ', error);
          return;
        }

        if (event?.completed) {
          await this.pointBiteAtUploadedImage(bite, objectPath);
        }
      },
    );
  }

  private async pointBiteAtUploadedImage(
    bite: Bite,
    objectPath: string,
  ): Promise<void> {
    const imagePath = await getDownloadUrlFromFirebaseStorage(objectPath);

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${bite.id}`,
      data: {
        ...bite,
        // The base64 copy is dropped: the document now points at Storage.
        image: '',
        imagePath,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });

    this.allBites.reload();
  }

  /**
   * Derives the geohash the proximity queries index on from the position the
   * Bite already carries.
   */
  async addGeohashToBite(bite: Bite): Promise<void> {
    const { latitude, longitude } = bite.position;

    await FirebaseFirestore.updateDocument({
      reference: `${BITE_COLLECTION}/${bite.id}`,
      data: {
        ...bite,
        geohash: geohashForLocation([latitude, longitude]),
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
      },
    });

    this.allBites.reload();
  }
}

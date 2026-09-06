import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import {
  Bite,
  Geopoint,
  GooglePlace,
  PlaceDetails,
  Restaurant,
  RestaurantCandidate,
} from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { isBase64String, resourceValue } from 'utils';
import { toSignal } from '@angular/core/rxjs-interop';

export const BITE_COLLECTION = 'bites';
export const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';
export const RESTAURANT_CANDIDATES_LIMIT = 5;
export const BITE_PLACES_LIMIT = 10;

/** A pending candidate together with the Bites that are the evidence for it. */
export interface AdminRestaurantCandidate extends RestaurantCandidate {
  bites: Bite[];
}

export interface VerifyRestaurantCandidateRequest {
  candidateId: string;
  restaurant: Partial<Restaurant>;
}

export interface VerifyRestaurantCandidateResult {
  restaurantId: string;
  menuId?: string;
  /** Number of menu items the backend derived from the candidate Bites. */
  menuItemCount?: number;
  candidateId: string;
  status: 'created' | 'already-verified';
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

/**
 * The reads and writes behind restaurant verification in the admin app.
 *
 * Candidate verification and the unmatched Bite places used to live on the
 * business dashboard, which meant every restaurant that signed in could turn a
 * candidate into a verified restaurant. Both are BiteTribe-internal, so both
 * moved here with issue #1473, and the business app keeps only the restaurants
 * it already owns.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  /** The restaurant a candidate or a place was turned into a draft of. */
  restaurantToCreate = toSignal(this.storeService.restaurantToCreate$);

  restaurantCandidatesLoader: ResourceLoader<
    AdminRestaurantCandidate[] | undefined,
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
          limit: RESTAURANT_CANDIDATES_LIMIT,
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
            limit: BITE_PLACES_LIMIT,
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

  // Guarded reads: `value()` throws once a read has failed (issue #1232).
  restaurantCandidatesValue = resourceValue(
    this.restaurantCandidates,
    [] as AdminRestaurantCandidate[],
  );
  bitePlacesValue = resourceValue(this.bitePlaces, [] as string[]);

  selectRestaurantToCreate(restaurant: Restaurant): void {
    this.storeService.selectRestaurantToCreate(restaurant);
  }

  submitNewRestaurant(restaurant: Restaurant): void {
    this.storeService.saveNewRestaurant(restaurant);
  }

  async searchPlaces(
    searchText: string,
    position?: Geopoint,
  ): Promise<GooglePlace[]> {
    return this.api.searchPlaces(searchText, position);
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | undefined> {
    return this.api.getPlaceDetails(placeId);
  }

  async verifyRestaurantCandidate(
    restaurant: Restaurant,
  ): Promise<VerifyRestaurantCandidateResult> {
    const candidateId = restaurant.restaurantCandidateId;

    if (!candidateId) {
      throw new Error('restaurantCandidateId is required for verification.');
    }

    const restaurantData: Partial<Restaurant> = { ...restaurant };
    delete restaurantData.id;
    delete restaurantData.unsaved;
    delete restaurantData.restaurantCandidateId;
    delete restaurantData.biteIds;
    delete restaurantData.bites;

    const result = await FirebaseFunctions.callByName<
      VerifyRestaurantCandidateRequest,
      VerifyRestaurantCandidateResult
    >({
      name: 'verifyRestaurantCandidate',
      data: {
        candidateId,
        restaurant: restaurantData,
      },
    });

    const verification = result.data;

    if (
      verification.status === 'created' &&
      restaurant.image &&
      isBase64String(restaurant.image)
    ) {
      await this.api.saveRestaurantImage(
        verification.restaurantId,
        restaurant.image,
      );
    }

    this.restaurantCandidates.reload();

    return verification;
  }

  logout(): void {
    this.storeService.logout();
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

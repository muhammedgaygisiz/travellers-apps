import {
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
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
export const RESTAURANT_COLLECTION = 'restaurants';
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

export interface AssignRestaurantOwnerRequest {
  restaurantId: string;
  ownerUserId: string;
  reason: string;
}

export interface AssignRestaurantOwnerResult {
  restaurantId: string;
  ownerUserId: string;
  claimStatus: 'claimed';
  /** `already-assigned` is the idempotent repeat: nothing was written. */
  status: 'assigned' | 'already-assigned';
}

export interface RevokeRestaurantOwnerRequest {
  restaurantId: string;
  reason: string;
}

/** One account on one restaurant (issue #1537). */
export interface RestaurantStaffMember {
  uid: string;
  email: string;
  displayName: string;
  addedBy: string;
  addedAt: string;
}

interface RestaurantStaffRequest {
  restaurantId: string;
}

interface ListRestaurantStaffResult {
  restaurantId: string;
  staff: RestaurantStaffMember[];
}

interface AddRestaurantStaffRequest extends RestaurantStaffRequest {
  email: string;
}

export interface AddRestaurantStaffResult {
  restaurantId: string;
  uid: string;
  roles: string[];
  status: 'added' | 'already-staff';
}

interface RemoveRestaurantStaffRequest extends RestaurantStaffRequest {
  uid: string;
}

export interface RevokeRestaurantOwnerResult {
  restaurantId: string;
  /** Who held it. The document no longer says. */
  previousOwnerUserId: string;
  claimStatus: 'revoked';
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

const toRestaurant = (doc: { id: string; data: unknown }): Restaurant =>
  ({
    ...(doc.data as Record<string, unknown>),
    id: doc.id,
  }) as Restaurant;

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

  /**
   * Every verified restaurant, with the ownership fields on it.
   *
   * Read whole rather than paged or queried, because the surface over it is a
   * filter an operator types into and a filter that covers a prefix of the
   * collection answers "no such restaurant" for one that exists — the bug issue
   * #1476 fixed in the account list. The collection is small enough for that:
   * `searchRestaurants` already reads all of it on every consumer search.
   *
   * The unowned restaurants are in it too. They are the ones an operator is
   * usually looking for, and hiding them behind a filter would make the surface
   * useless for the thing it exists to do.
   *
   * Sorted by name, because the list is read by a person looking for one
   * restaurant. Firestore returns them in document-id order, which is arbitrary
   * to anyone who is not Firestore.
   */
  restaurantsLoader: ResourceLoader<Restaurant[] | undefined, unknown> =
    async () => {
      const docs = await FirebaseFirestore.getCollection({
        reference: RESTAURANT_COLLECTION,
      });

      return (docs?.snapshots ?? [])
        .map(toRestaurant)
        .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    };

  restaurants = resource({
    loader: this.restaurantsLoader.bind(this),
  });

  // Guarded reads: `value()` throws once a read has failed (issue #1232).
  restaurantCandidatesValue = resourceValue(
    this.restaurantCandidates,
    [] as AdminRestaurantCandidate[],
  );
  bitePlacesValue = resourceValue(this.bitePlaces, [] as string[]);
  restaurantsValue = resourceValue(this.restaurants, [] as Restaurant[]);

  /**
   * The restaurant whose staff the operator is looking at.
   *
   * Its own signal rather than the ownership surface's selection, because the
   * staff list is loaded for whichever restaurant is open and the selection
   * lives in the integration service. Set by that service when a restaurant is
   * picked.
   */
  staffRestaurantId = signal<string | undefined>(undefined);

  /**
   * The staff of one restaurant, through the callable.
   *
   * The operator reads it the same way the restaurant's own owner does
   * (issue #1537). `firestore.rules` would let an operator read
   * `/restaurantStaff` directly, but the email address behind each uid lives
   * in Firebase Auth and no client query reaches it - which is the same reason
   * the account list goes through `listUsersWithRoles`.
   */
  restaurantStaffLoader: ResourceLoader<
    RestaurantStaffMember[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    if (!restaurantId) {
      return [];
    }

    const { data } = await FirebaseFunctions.callByName<
      RestaurantStaffRequest,
      ListRestaurantStaffResult
    >({ name: 'listRestaurantStaff', data: { restaurantId } });

    return data.staff ?? [];
  };

  restaurantStaff = resource({
    params: () => ({ restaurantId: this.staffRestaurantId() }),
    loader: this.restaurantStaffLoader.bind(this),
  });

  restaurantStaffValue = resourceValue(
    this.restaurantStaff,
    [] as RestaurantStaffMember[],
  );

  /**
   * Puts an account on a restaurant as staff, as an operator.
   *
   * The same callable the restaurant's own owner uses, admitted by `RD-UR-6`
   * rather than by ownership. It is the way back for a restaurant that removed
   * its last account with access, which is why the operator has this at all -
   * `setUserRoles` can grant `staff` but cannot write the association, and the
   * role without the association is an account inside the business app with
   * nothing to do there.
   */
  async addRestaurantStaff(
    restaurantId: string,
    email: string,
  ): Promise<AddRestaurantStaffResult> {
    const { data } = await FirebaseFunctions.callByName<
      AddRestaurantStaffRequest,
      AddRestaurantStaffResult
    >({ name: 'addRestaurantStaff', data: { restaurantId, email } });

    this.restaurantStaff.reload();

    return data;
  }

  async removeRestaurantStaff(
    restaurantId: string,
    uid: string,
  ): Promise<void> {
    await FirebaseFunctions.callByName<RemoveRestaurantStaffRequest, unknown>({
      name: 'removeRestaurantStaff',
      data: { restaurantId, uid },
    });

    this.restaurantStaff.reload();
  }

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

  /**
   * Assigns a restaurant to a business account.
   *
   * The callable is the authority on every rule this cannot see: that the
   * account holds `business`, that the restaurant is not already held by
   * somebody else, and that the two writes happen together. What this adds is
   * the reload, so the list stops showing an assignment that has changed.
   */
  async assignRestaurantOwner(
    restaurantId: string,
    ownerUserId: string,
    reason: string,
  ): Promise<AssignRestaurantOwnerResult> {
    const { data } = await FirebaseFunctions.callByName<
      AssignRestaurantOwnerRequest,
      AssignRestaurantOwnerResult
    >({
      name: 'assignRestaurantOwner',
      data: { restaurantId, ownerUserId, reason },
    });

    this.restaurants.reload();

    return data;
  }

  /**
   * Takes a restaurant back from the account holding it.
   *
   * Its own callable rather than `assignRestaurantOwner` with an empty owner,
   * because reassignment is deliberately two decisions: the operator log then
   * carries a reason for the removal and a reason for the grant instead of one
   * write that quietly replaced an accountable party (issue #1077).
   */
  async revokeRestaurantOwner(
    restaurantId: string,
    reason: string,
  ): Promise<RevokeRestaurantOwnerResult> {
    const { data } = await FirebaseFunctions.callByName<
      RevokeRestaurantOwnerRequest,
      RevokeRestaurantOwnerResult
    >({
      name: 'revokeRestaurantOwner',
      data: { restaurantId, reason },
    });

    this.restaurants.reload();

    return data;
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

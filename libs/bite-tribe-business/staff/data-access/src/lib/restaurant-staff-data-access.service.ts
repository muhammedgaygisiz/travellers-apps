import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Restaurant } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { resourceValue } from 'utils';

export const RESTAURANT_COLLECTION = 'restaurants';

/** One account on one restaurant, as the staff surface shows it. */
export interface RestaurantStaffMember {
  uid: string;
  email: string;
  displayName: string;
  addedBy: string;
  addedAt: string;
}

interface ListRestaurantStaffRequest {
  restaurantId: string;
}

interface ListRestaurantStaffResult {
  restaurantId: string;
  staff: RestaurantStaffMember[];
}

interface AddRestaurantStaffRequest {
  restaurantId: string;
  email: string;
}

export interface AddRestaurantStaffResult {
  restaurantId: string;
  uid: string;
  roles: string[];
  /** `already-staff` is the idempotent repeat: nothing was written. */
  status: 'added' | 'already-staff';
}

interface RemoveRestaurantStaffRequest {
  restaurantId: string;
  uid: string;
}

interface RemoveRestaurantStaffResult {
  restaurantId: string;
  uid: string;
  roles: string[];
}

/**
 * The staff on one restaurant, read and written entirely through callables.
 *
 * Nothing here touches Firestore directly, and that is the shape of the
 * feature rather than a preference. A staff grant is a `staff` custom claim
 * and a `/restaurantStaff` document that have to be written together, and a
 * client can write neither: claims are backend-only, and issue #1078's rules
 * allow no client write to the association at all. So `addRestaurantStaff` and
 * `removeRestaurantStaff` are the only writers (issue #1537).
 *
 * The list goes through a callable too, for a smaller reason: the rules do
 * allow the owner to read one association document, but authorising a
 * *collection* query that way costs a `get()` on the restaurant per result.
 * The callable also joins the email off Firebase Auth, which no client query
 * can reach.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantStaffDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  /**
   * The restaurant comes from the **route parameter**, not from the loaded
   * restaurant.
   *
   * The same reason `saveMenu` reads it that way: `restaurant$` is a derived
   * selector that is `undefined` whenever there is no GPS position, which is
   * an ordinary state for anyone who declined the location permission — and
   * this page is reachable by direct URL without going through the edit form
   * that populates it. The route always carries `:restaurantId`, and it is the
   * id `ownedRestaurantGuard` and the callable both authorise against.
   */
  readonly restaurantId = this.storeService.restaurantIdFromUrl;

  readonly staffLoader: ResourceLoader<
    RestaurantStaffMember[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    if (!restaurantId) {
      return [];
    }

    const { data } = await FirebaseFunctions.callByName<
      ListRestaurantStaffRequest,
      ListRestaurantStaffResult
    >({ name: 'listRestaurantStaff', data: { restaurantId } });

    return data.staff ?? [];
  };

  readonly staff = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.staffLoader.bind(this),
  });

  /**
   * The restaurant the page is about, read for its name alone.
   *
   * A page that says "Staff" and lists three email addresses does not say
   * which restaurant they work at, and the owner reached it from a list where
   * every entry looks the same. Read here rather than taken from the store,
   * for the reason on `restaurantId` above.
   */
  readonly restaurantLoader: ResourceLoader<
    Restaurant | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    if (!restaurantId) {
      return undefined;
    }

    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
    });

    return snapshot?.data
      ? ({ ...snapshot.data, id: snapshot.id } as Restaurant)
      : undefined;
  };

  readonly restaurant = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.restaurantLoader.bind(this),
  });

  // Guarded reads: `value()` throws once a read has failed (issue #1232).
  readonly staffValue = resourceValue(
    this.staff,
    [] as RestaurantStaffMember[],
  );
  readonly restaurantValue = resourceValue(this.restaurant);

  async addStaff(
    restaurantId: string,
    email: string,
  ): Promise<AddRestaurantStaffResult> {
    const { data } = await FirebaseFunctions.callByName<
      AddRestaurantStaffRequest,
      AddRestaurantStaffResult
    >({ name: 'addRestaurantStaff', data: { restaurantId, email } });

    this.staff.reload();

    return data;
  }

  async removeStaff(
    restaurantId: string,
    uid: string,
  ): Promise<RemoveRestaurantStaffResult> {
    const { data } = await FirebaseFunctions.callByName<
      RemoveRestaurantStaffRequest,
      RemoveRestaurantStaffResult
    >({ name: 'removeRestaurantStaff', data: { restaurantId, uid } });

    this.staff.reload();

    return data;
  }
}

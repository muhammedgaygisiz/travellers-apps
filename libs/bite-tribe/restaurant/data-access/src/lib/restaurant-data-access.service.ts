import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { LikeClick } from 'model';

/** Who follows what: the one pair a follow read or write is about. */
interface FollowKey {
  userId: string;
  restaurantId: string;
}

/**
 * Read side of a restaurant for the consumer app.
 *
 * Editing a restaurant is a business-app capability and its writes live in
 * `bite-tribe-business/restaurant-data-access`. They used to sit here, which
 * meant the business edit page reached across the scope boundary into the
 * consumer's library to reach them. See GitHub issue #1317.
 *
 * The one write is the guest's own follow of the restaurant (GitHub issue
 * #2132), which is about the guest, not the restaurant.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  bite = toSignal(this.storeService.bite$);
  biteIdFromUrl = this.storeService.biteIdFromUrl;
  bites = toSignal(this.storeService.bitesByRestaurant$);
  userId = toSignal(this.storeService.userId$);
  restaurant = toSignal(this.storeService.restaurant$);
  restaurantNotFound = toSignal(this.storeService.restaurantNotFound$, {
    initialValue: false,
  });

  /**
   * The follow this page is about, or nothing: signed out, or a place that is
   * not a stored restaurant. A place known only from its Bites cannot be
   * followed (GitHub issue #2132).
   */
  private readonly followKey = computed(
    (): FollowKey | undefined => {
      const userId = this.userId();
      const restaurant = this.restaurant();

      return userId && restaurant?.id && !restaurant.unsaved
        ? { userId, restaurantId: restaurant.id }
        : undefined;
    },
    {
      equal: (a, b) =>
        a?.userId === b?.userId && a?.restaurantId === b?.restaurantId,
    },
  );

  private readonly followResource = resource({
    params: () => this.followKey(),
    loader: ({ params }) =>
      this.api.isFollowingRestaurant(params.userId, params.restaurantId),
  });

  /**
   * Whether the guest follows the restaurant, or `undefined` while that is not
   * known: no follow to ask about, still reading, or the read failed. The
   * page offers the button only once it is known, so it never shows "Follow"
   * to somebody who already does.
   *
   * A linked signal over the read, so a toggle shows at once and the read of
   * the next restaurant replaces it.
   */
  following = linkedSignal<boolean | undefined>(() =>
    this.followResource.hasValue() ? this.followResource.value() : undefined,
  );

  /** A follow or unfollow is being written. */
  followPending = signal(false);

  /**
   * Follows or unfollows, showing the new state at once and putting the old
   * one back if the write is refused. Resolves to whether it landed, so the
   * page can say when it did not.
   */
  async toggleFollow(): Promise<boolean> {
    const key = this.followKey();
    const following = this.following();

    if (!key || following === undefined || this.followPending()) {
      return true;
    }

    this.followPending.set(true);
    this.following.set(!following);

    try {
      if (following) {
        await this.api.unfollowRestaurant(key.userId, key.restaurantId);
      } else {
        await this.api.followRestaurant(key.userId, key.restaurantId);
      }

      return true;
    } catch {
      this.following.set(following);

      return false;
    } finally {
      this.followPending.set(false);
    }
  }

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }
}

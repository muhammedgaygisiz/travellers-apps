import { computed, inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, LikeClick, Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { ToastService } from 'toast';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  dataAccess = inject(RestaurantDataAccessService);
  private readonly homeDataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

  bites = this.homeDataAccess.restaurantBites;
  bite = computed(
    () => this.dataAccess.bite() ?? this.sourceBiteFromLoadedBites(),
  );
  userId = this.dataAccess.userId;
  restaurant = this.dataAccess.restaurant;
  restaurantNotFound = this.dataAccess.restaurantNotFound;
  following = this.dataAccess.following;
  followPending = this.dataAccess.followPending;

  /**
   * Follows or unfollows the restaurant (GitHub issue #2132). The button
   * shows the new state at once; a refused write puts it back and says so.
   */
  async toggleFollow(): Promise<void> {
    const wasFollowing = this.following();
    const landed = await this.dataAccess.toggleFollow();

    if (!landed) {
      await this.toast.present({
        messageKey: wasFollowing
          ? 'restaurant-unfollow-failed'
          : 'restaurant-follow-failed',
        outcome: 'failure',
      });
    }
  }

  /**
   * The route's Bites have not arrived yet. Only a first load counts: a
   * `reload()` from the Bites list keeps the old ones on screen, and must not
   * put this page back on its skeleton. See GitHub issue #2124.
   */
  bitesLoading = computed(
    () => this.homeDataAccess.restaurantBitesResource.status() === 'loading',
  );

  navigateToMenu(restaurant: Restaurant | undefined): void {
    const bite = this.bite();
    const biteId = this.currentBiteId();
    const menuId = this.normaliseMenuId(restaurant, restaurant?.menuId);

    if (restaurant?.id && biteId && menuId) {
      this.gotoMenu(biteId, restaurant.id, menuId);

      return;
    }

    if (!menuId && bite) {
      this.gotoDynamicMenu(bite);
    }
  }

  private gotoMenu(biteId: string, restaurantId: string, menuId: string): void {
    void this.navController.navigateForward([
      PATH.BITE,
      biteId,
      PATH.RESTAURANT,
      restaurantId,
      PATH.MENU,
      menuId,
    ]);
  }

  private gotoDynamicMenu = (bite: Bite): void => {
    void this.navController.navigateForward([
      PATH.BITE,
      bite.id,
      PATH.RESTAURANT,
      encodeURIComponent(bite.place),
      PATH.MENU,
      'default',
    ]);
  };

  navigateToRestaurantBites(restaurant: Restaurant | undefined): void {
    const bite = this.bite();
    if (!bite) {
      return;
    }

    const restaurantIdFromBite = this.normaliseRestaurantId(bite.restaurantId);
    const restaurantId = restaurantIdFromBite ?? restaurant?.id;

    if (restaurantId) {
      void this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurantId,
        'bites',
      ]);

      return;
    }

    void this.navController.navigateForward([
      'bite',
      bite.id,
      'restaurant',
      encodeURIComponent(bite.place),
      'bites',
    ]);
  }

  navigateToPlaceBites(bite: Bite | undefined): void {
    const sourceBite = bite ?? this.bite();
    if (!sourceBite) {
      return;
    }

    void this.navController.navigateForward([
      'bite',
      sourceBite.id,
      'restaurant',
      encodeURIComponent(sourceBite.place),
      'bites',
    ]);
  }

  private sourceBiteFromLoadedBites(): Bite | undefined {
    const biteId = this.dataAccess.biteIdFromUrl();
    const bites = this.bites();

    return bites.find((bite) => bite.id === biteId) ?? bites[0];
  }

  private normaliseRestaurantId(
    restaurantPath: string | undefined,
  ): string | undefined {
    if (!restaurantPath) {
      return undefined;
    }

    const segments = restaurantPath.split('/').filter(Boolean);
    return segments[segments.length - 1];
  }

  private normaliseMenuId(
    restaurant: Restaurant | undefined,
    fallbackMenuId?: string,
  ): string | undefined {
    const menuPath = restaurant?.menuId ?? fallbackMenuId;

    if (menuPath) {
      const menuId = menuPath.split('/').filter(Boolean).pop();

      return menuId ?? fallbackMenuId;
    }

    return fallbackMenuId;
  }

  private currentBiteId(): string | undefined {
    return this.bite()?.id ?? this.dataAccess.biteIdFromUrl();
  }

  /**
   * The unverified place page has nothing to show: its Bites have finished
   * loading and neither they nor the store hold the Bite it was opened from,
   * so there is no name, position or rating. See GitHub issue #2125.
   */
  placeNotFound = computed(() => !this.bitesLoading() && !this.bite());

  /**
   * The place's way out. Not back to the Bite: on this page the Bite is the
   * thing that could not be found. See GitHub issue #2125.
   */
  navigateBackToFeed(): void {
    void this.navController.navigateBack([PATH.HOME]);
  }

  /** The not-found state's way out: back to the Bite the page was opened from. */
  navigateBackToBite(): void {
    const biteId = this.dataAccess.biteIdFromUrl();

    void this.navController.navigateBack(biteId ? [PATH.BITE, biteId] : ['/']);
  }

  biteClicked(bite: Bite): void {
    void this.navController.navigateForward(['bite', bite.id]);
  }

  likeButtonClicked(likeClick: LikeClick): void {
    this.dataAccess.submitLikeClick(likeClick);
  }
}

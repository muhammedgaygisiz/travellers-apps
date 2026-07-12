import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, LikeClick, Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  dataAccess = inject(RestaurantDataAccessService);
  private readonly homeDataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;
  bites = this.homeDataAccess.restaurantBites;
  userId = this.dataAccess.userId;
  restaurant = this.dataAccess.restaurant;

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
    const sourceBite = bite ?? this.resolveSourceBite();
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

  private resolveSourceBite(): Bite | undefined {
    const biteFromStore = this.bite();
    if (biteFromStore) {
      return biteFromStore;
    }

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

  biteClicked(bite: Bite): void {
    void this.navController.navigateForward(['bite', bite.id]);
  }

  likeButtonClicked(likeClick: LikeClick): void {
    this.dataAccess.submitLikeClick(likeClick);
  }
}

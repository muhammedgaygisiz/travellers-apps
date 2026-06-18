import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, Like, Link, Restaurant } from 'model';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { PATH } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  dataAccess = inject(RestaurantDataAccessService);
  private readonly homeDataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toastController = inject(ToastController);

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

  gotoEditMenu(restaurantId: string, menuId: string | undefined): void {
    const biteId = this.currentBiteId();
    const normalisedMenuId = this.normaliseMenuId(undefined, menuId);

    if (restaurantId && biteId && normalisedMenuId) {
      this.gotoMenu(biteId, restaurantId, normalisedMenuId);
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
    if (!bite) {
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

  async createMenu(): Promise<void> {
    const restaurant = this.restaurant();
    if (!restaurant) {
      return;
    }

    try {
      const menuId = await this.dataAccess.createMenuForRestaurant(
        restaurant.id,
      );
      this.gotoEditMenu(restaurant.id, menuId);
    } catch {
      await this.showToast('Something went wrong. Please try again.', 'danger');
    }
  }

  async submitSocialMediaLinks({
    links,
  }: Partial<{ links: Link[] }>): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant && links) {
      try {
        await this.dataAccess.submitSocialMediaLinks(restaurant.id, links);
        await this.showToast(
          'Social media links saved successfully.',
          'success',
        );
      } catch {
        await this.showToast(
          'Something went wrong. Please try again.',
          'danger',
        );
      }
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  likeButtonClicked(likeClick: Like): void {
    this.dataAccess.submitLikeClick(likeClick);
  }
}

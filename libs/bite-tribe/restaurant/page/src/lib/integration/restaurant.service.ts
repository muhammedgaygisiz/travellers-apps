import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, Like, Link, Restaurant } from 'model';
import { NavController, ToastController } from '@ionic/angular/standalone';

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
    if (bite && restaurant?.menuId) {
      const menuId = this.normaliseMenuId(restaurant, restaurant.menuId);

      if (menuId) {
        void this.navController.navigateForward([
          'bite',
          bite.id,
          'restaurant',
          restaurant.id,
          'menu',
          menuId,
        ]);

        return;
      }
    }

    const menuId = restaurant?.menuId;
    if (menuId && bite) {
      this.gotoMaintainedMenu(bite, restaurant);

      return;
    }

    if (bite) {
      this.gotoDynamicMenu(bite);
    }

    if (menuId) {
      this.gotoEditMenu(restaurant.id, menuId);
    }
  }

  gotoEditMenu(restaurantId: string, menuId: string | undefined): void {
    if (restaurantId && menuId) {
      void this.navController.navigateForward([
        'restaurant',
        restaurantId,
        'menu',
        menuId,
      ]);
    }
  }

  private gotoMaintainedMenu(
    bite: Bite,
    restaurant: Restaurant | undefined,
  ): void {
    const normalisedMenuId = this.normaliseMenuId(restaurant);
    if (restaurant && normalisedMenuId) {
      void this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurant.id,
        'menu',
        normalisedMenuId,
      ]);
    }
  }

  private gotoDynamicMenu = (bite: Bite): void => {
    void this.navController.navigateForward([
      'bite',
      bite.id,
      'restaurant',
      encodeURIComponent(bite.place),
      'menu',
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
    if (restaurant?.menuId) {
      const menuId = restaurant.menuId.split('/').filter(Boolean).pop();

      return menuId ?? fallbackMenuId;
    }

    return fallbackMenuId;
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

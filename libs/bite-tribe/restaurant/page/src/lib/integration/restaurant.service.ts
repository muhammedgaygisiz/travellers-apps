import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, Like, Link, Restaurant } from 'model';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  dataAccess = inject(RestaurantDataAccessService);
  private readonly homeDataAccess = inject(HomeDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  bite = this.dataAccess.bite;
  bites = this.homeDataAccess.restaurantBites;
  userId = this.dataAccess.userId;
  restaurant = this.dataAccess.restaurant;

  navigateToMenu(restaurant: Restaurant | undefined): void {
    const bite = this.bite();
    if (bite && restaurant?.menuId) {
      const menuId = this.normaliseMenuId(restaurant, restaurant.menuId);

      if (menuId) {
        this.navController.navigateForward([
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

  gotoEditMenu(restaurantId: string, menuId: string): void {
    void this.navController.navigateForward([
      'restaurant',
      restaurantId,
      'menu',
      menuId,
    ]);
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

  navigateToBites(restaurant: Restaurant | undefined): void {
    const bite = this.bite();

    if (bite?.restaurantId) {
      const [empty, collectionName, restaurantId] =
        bite.restaurantId.split('/');

      if (restaurantId) {
        this.navController.navigateForward([
          'bite',
          bite.id,
          'restaurant',
          restaurantId,
          'bites',
        ]);

        return;
      }
    }

    if (bite && restaurant?.menuId) {
      this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurant.id,
        'bites',
      ]);

      return;
    }

    if (bite) {
      this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        encodeURIComponent(bite.place),
        'bites',
      ]);
    }
  }

  private normaliseMenuId(
    restaurant: Restaurant | undefined,
    fallbackMenuId?: string,
  ): string | undefined {
    if (restaurant?.menuId) {
      const [empty, collectionName, menuId] = restaurant.menuId.split('/');

      return menuId ?? fallbackMenuId;
    }

    return fallbackMenuId;
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  async submitSocialMediaLinks({ links }: Partial<{ links: Link[] }>): Promise<void> {
    const restaurant = this.restaurant();
    if (restaurant && links) {
      try {
        await this.dataAccess.submitSocialMediaLinks(restaurant.id, links);
        await this.showToast('social-media-links-saved', 'success');
      } catch {
        await this.showToast('something-went-wrong-please-try-again', 'danger');
      }
    }
  }

  private async showToast(messageKey: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message: this.transloco.translate(messageKey),
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

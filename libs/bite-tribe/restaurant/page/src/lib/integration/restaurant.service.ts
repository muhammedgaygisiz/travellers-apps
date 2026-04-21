import { inject, Injectable } from '@angular/core';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, Like, Link, Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';

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
  darkTheme = this.dataAccess.darkTheme;

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

  submitSocialMediaLinks({ links }: Partial<{ links: Link[] }>): void {
    const restaurant = this.restaurant();
    if (restaurant && links) {
      this.dataAccess.submitSocialMediaLinks(restaurant.id, links);
    }
  }

  likeButtonClicked(likeClick: Like): void {
    this.dataAccess.submitLikeClick(likeClick);
  }
}

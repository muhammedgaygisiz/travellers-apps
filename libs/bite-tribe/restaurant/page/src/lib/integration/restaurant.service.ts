import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, Like, Link, Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;
  bites = this.dataAccess.bites;
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
    if (menuId) {
      const normalisedMenuId = this.normaliseMenuId(restaurant);

      if (normalisedMenuId) {
        this.navController.navigateForward([
          'restaurant',
          restaurant.id,
          'menu',
          normalisedMenuId,
        ]);

        return;
      }
    }

    if (menuId) {
      this.navController.navigateForward([
        'restaurant',
        restaurant?.id,
        'menu',
        menuId,
      ]);
    }
  }

  navigateToBites(restaurant: Restaurant | undefined): void {
    const bite = this.bite();
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

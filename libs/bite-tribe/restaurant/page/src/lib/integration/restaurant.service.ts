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
      const menuId = this.getMenuId(restaurant);

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

    if (restaurant?.menuId) {
      const menuId = this.getMenuId(restaurant);

      if (menuId) {
        this.navController.navigateForward([
          'restaurant',
          restaurant.id,
          'menu',
          menuId,
        ]);
      }
    }
  }

  private getMenuId(restaurant: Restaurant): string | undefined {
    if (restaurant?.menuId) {
      const [empty, collectionName, menuId] = restaurant.menuId.split('/');

      return menuId;
    }

    return undefined;
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

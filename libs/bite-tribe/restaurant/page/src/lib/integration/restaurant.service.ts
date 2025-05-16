import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;
  restaurant = this.dataAccess.restaurant;

  navigateToMenu(restaurant: Restaurant | undefined) {
    const bite = this.bite();
    if (bite && restaurant?.menuId) {
      // eslint-disable-next-line no-unused-vars
      const [empty, collectionName, menuId] = restaurant.menuId.split('/');

      this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurant.id,
        'menu',
        menuId,
      ]);
    }
  }
}

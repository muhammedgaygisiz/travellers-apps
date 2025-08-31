import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';
import { Bite, Restaurant } from 'model';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);

  restaurantToCreate = this.dataAccess.restaurantToCreate;

  submitNewRestaurant(restaurant: Restaurant): void {
    this.dataAccess.submitNewRestaurant(restaurant);

    this.navController.navigateBack(['dashboard']);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }
}

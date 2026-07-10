import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';
import { Bite, Restaurant } from 'model';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class NewRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);

  restaurantToCreate = this.dataAccess.restaurantToCreate;

  async submitNewRestaurant(restaurant: Restaurant): Promise<void> {
    if (restaurant.restaurantCandidateId) {
      await this.dataAccess.verifyRestaurantCandidate(restaurant);
    } else {
      this.dataAccess.submitNewRestaurant(restaurant);
    }

    this.navController.navigateBack(['dashboard']);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }
}

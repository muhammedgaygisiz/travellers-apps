import { inject, Injectable } from '@angular/core';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { PublicUser, Restaurant } from 'model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  dataAccess = inject(DashboardDataAccessService);
  private readonly navController = inject(NavController);

  organisations = this.dataAccess.organisations;
  restaurants = this.dataAccess.restaurants;
  bitePlaces = this.dataAccess.bitePlaces;
  isAuthenticated = this.dataAccess.isAuthenticated;
  gpsPosition = this.dataAccess.gpsPosition;

  logout(): void {
    this.dataAccess.logout();
  }

  onCreateRestaurantClick(restaurant: Restaurant): void {
    this.dataAccess.selectRestaurantToCreate(restaurant);

    this.navController.navigateForward(['new-restaurant']);
  }

  restaurantClicked(restaurant: Restaurant): void {
    const restaurantId = restaurant.id;

    if (restaurantId) {
      this.navController.navigateForward(['restaurant', restaurantId]);
      return;
    }

    const restaurantName = restaurant.name;
    if (restaurantName) {
      this.navController.navigateForward([
        'restaurant',
        encodeURIComponent(restaurantName),
      ]);
      return;
    }
  }

  organisationClicked(organisation: PublicUser): void {
    const organisationId = organisation.userId;

    if (organisationId) {
      this.navController.navigateForward([organisationId, 'dashboard']);
    }
  }

  gotoMigrations(): void {
    this.navController.navigateForward(['migrations']);
  }

  placeClicked(placeName: string): void {
    const restaurant: Restaurant = {
      id: '',
      name: placeName,
      position: { latitude: 0, longitude: 0 },
      unsaved: true,
    };

    this.onCreateRestaurantClick(restaurant);
  }
}

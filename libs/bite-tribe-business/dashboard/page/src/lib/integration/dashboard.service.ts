import { inject, Injectable } from '@angular/core';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import { DashboardSection } from '../component/page/dashboard.component';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  dataAccess = inject(DashboardDataAccessService);
  private readonly navController = inject(NavController);

  restaurants = this.dataAccess.restaurants;
  biteTrails = this.dataAccess.biteTrails;

  // Read guarded: `value()` throws once a read has failed (#1232).
  restaurantsValue = this.dataAccess.restaurantsValue;
  biteTrailsValue = this.dataAccess.biteTrailsValue;
  isAuthenticated = this.dataAccess.isAuthenticated;
  gpsPosition = this.dataAccess.gpsPosition;

  logout(): void {
    this.dataAccess.logout();
  }

  sectionClicked(section: DashboardSection): void {
    void this.navController.navigateForward([section.path]);
  }

  restaurantClicked(restaurant: Restaurant): void {
    const restaurantId = restaurant.id;

    if (restaurantId) {
      void this.navController.navigateForward(['restaurant', restaurantId]);
      return;
    }

    const restaurantName = restaurant.name;
    if (restaurantName) {
      void this.navController.navigateForward([
        'restaurant',
        encodeURIComponent(restaurantName),
      ]);
      return;
    }
  }

  createBiteTrailClicked(): void {
    void this.navController.navigateForward(['create-bite-trail']);
  }
}

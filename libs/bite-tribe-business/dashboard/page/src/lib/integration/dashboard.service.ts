import { inject, Injectable } from '@angular/core';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Restaurant } from 'model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  dataAccess = inject(DashboardDataAccessService);
  private readonly navController = inject(NavController);

  restaurants = this.dataAccess.restaurants;

  logout() {
    this.dataAccess.logout();
  }

  onCreateRestaurantClick(restaurant: Restaurant) {
    this.dataAccess.selectRestaurantToCreate(restaurant);

    this.navController.navigateForward(['new-restaurant']);
  }
}

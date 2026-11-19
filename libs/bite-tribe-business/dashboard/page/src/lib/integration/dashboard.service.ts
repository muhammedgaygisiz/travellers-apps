import { inject, Injectable } from '@angular/core';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import {
  DashboardSection,
  SetupItemClick,
} from '../component/page/dashboard.component';

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

  /**
   * Opens the screen that completes a checklist item (GitHub issue #2126):
   * the menu editor for "menu reviewed" when the restaurant has a menu, and
   * the edit page for everything else - including a restaurant with no menu
   * yet, whose edit page is where one is created.
   */
  setupItemClicked({ restaurant, item }: SetupItemClick): void {
    const menuId = restaurant.menuId?.split('/').filter(Boolean).pop();

    if (item.target === 'edit-menu' && menuId) {
      void this.navController.navigateForward([
        'restaurant',
        restaurant.id,
        'menu',
        menuId,
      ]);
      return;
    }

    void this.navController.navigateForward(['restaurant', restaurant.id]);
  }

  /**
   * Reads the restaurants again. The checklist is ticked from the stored
   * restaurant, so coming back from an edit has to re-read it to show what
   * the owner just completed.
   */
  refreshRestaurants(): void {
    this.dataAccess.restaurants.reload();
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

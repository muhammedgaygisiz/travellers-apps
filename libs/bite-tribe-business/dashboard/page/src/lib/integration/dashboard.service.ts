import { computed, inject, Injectable } from '@angular/core';
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
  /**
   * The restaurants read has settled at least once. A failed read is not "no
   * restaurant", so only a resolved read lets the empty state show (GitHub
   * issue #2127).
   */
  restaurantsLoaded = computed(() => {
    const status = this.dataAccess.restaurants.status();

    return status === 'resolved' || status === 'local';
  });
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
   * otherwise the section of the restaurant that holds the field (GitHub
   * issue #2183). "Menu reviewed" without a menu opens the restaurant's
   * overview, which is where one is created.
   */
  setupItemClicked({ restaurant, item }: SetupItemClick): void {
    if (item.target === 'edit-menu') {
      const menuId = restaurant.menuId?.split('/').filter(Boolean).pop();

      void this.navController.navigateForward(
        menuId
          ? ['restaurant', restaurant.id, 'menu', menuId]
          : ['restaurant', restaurant.id],
      );
      return;
    }

    void this.navController.navigateForward([
      'restaurant',
      restaurant.id,
      'edit',
      item.target,
    ]);
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

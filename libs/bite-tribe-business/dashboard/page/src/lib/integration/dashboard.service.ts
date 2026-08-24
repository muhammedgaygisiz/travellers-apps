import { inject, Injectable } from '@angular/core';
import {
  DashboardDataAccessService,
  DashboardRestaurantCandidate,
} from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { PageMenuTarget } from 'common/ui/page';
import { Restaurant } from 'model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  dataAccess = inject(DashboardDataAccessService);
  private readonly navController = inject(NavController);

  restaurants = this.dataAccess.restaurants;
  biteTrails = this.dataAccess.biteTrails;
  bitePlaces = this.dataAccess.bitePlaces;
  restaurantCandidates = this.dataAccess.restaurantCandidates;

  // Read guarded: `value()` throws once a read has failed (#1232).
  restaurantsValue = this.dataAccess.restaurantsValue;
  biteTrailsValue = this.dataAccess.biteTrailsValue;
  bitePlacesValue = this.dataAccess.bitePlacesValue;
  restaurantCandidatesValue = this.dataAccess.restaurantCandidatesValue;
  isAuthenticated = this.dataAccess.isAuthenticated;
  gpsPosition = this.dataAccess.gpsPosition;

  logout(): void {
    this.dataAccess.logout();
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

  gotoMigrations(): void {
    void this.navController.navigateForward(['migrations']);
  }

  onMenuNavigate(target: PageMenuTarget): void {
    if (target === 'migrations') {
      this.gotoMigrations();
    }
  }

  placeClicked(placeName: string): void {
    const restaurant: Restaurant = {
      id: '',
      name: placeName,
      position: { latitude: 0, longitude: 0 },
      unsaved: true,
    };

    this.dataAccess.selectRestaurantToCreate(restaurant);

    void this.navController.navigateForward(['new-restaurant']);
  }

  restaurantCandidateClicked(candidate: DashboardRestaurantCandidate): void {
    const restaurant: Restaurant = {
      id: '',
      name: candidate.name,
      position: candidate.position,
      restaurantCandidateId: candidate.id,
      biteIds: candidate.biteIds ?? [],
      bites: candidate.bites,
      unsaved: true,
    };

    this.dataAccess.selectRestaurantToCreate(restaurant);

    void this.navController.navigateForward(['new-restaurant']);
  }
}

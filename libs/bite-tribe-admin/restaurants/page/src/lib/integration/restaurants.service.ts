import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { Restaurant } from 'model';
import {
  AdminRestaurantCandidate,
  RestaurantsDataAccessService,
} from 'bite-tribe-admin/restaurants-data-access';

/**
 * The two ways an operator starts a verified restaurant: from a clustered
 * candidate, or from a place name Bites already carry.
 *
 * Both seed the same draft in the store and open the same form, which is why
 * one service owns them rather than one per surface.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  private readonly dataAccess = inject(RestaurantsDataAccessService);
  private readonly navController = inject(NavController);

  readonly candidates = this.dataAccess.restaurantCandidatesValue;
  readonly places = this.dataAccess.bitePlacesValue;

  candidateClicked(candidate: AdminRestaurantCandidate): void {
    this.dataAccess.selectRestaurantToCreate({
      id: '',
      name: candidate.name,
      position: candidate.position,
      restaurantCandidateId: candidate.id,
      biteIds: candidate.biteIds ?? [],
      bites: candidate.bites,
      unsaved: true,
    });

    void this.navController.navigateForward(['new-restaurant']);
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

  logout(): void {
    this.dataAccess.logout();
  }
}

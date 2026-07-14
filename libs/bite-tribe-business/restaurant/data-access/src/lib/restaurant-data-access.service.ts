import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Geopoint, GooglePlace, PlaceDetails, Restaurant } from 'model';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeApiService } from 'bite-tribe/api';
import { isBase64String } from 'utils';

export interface VerifyRestaurantCandidateRequest {
  candidateId: string;
  restaurant: Partial<Restaurant>;
}

export interface VerifyRestaurantCandidateResult {
  restaurantId: string;
  menuId?: string;
  candidateId: string;
  status: 'created' | 'already-verified';
}

@Injectable({
  providedIn: 'root',
})
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  restaurantToCreate = toSignal(this.storeService.restaurantToCreate$);

  submitNewRestaurant(restaurant: Restaurant): void {
    this.storeService.saveNewRestaurant(restaurant);
  }

  async searchPlaces(
    searchText: string,
    position?: Geopoint,
  ): Promise<GooglePlace[]> {
    return this.api.searchPlaces(searchText, position);
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | undefined> {
    return this.api.getPlaceDetails(placeId);
  }

  async verifyRestaurantCandidate(
    restaurant: Restaurant,
  ): Promise<VerifyRestaurantCandidateResult> {
    const candidateId = restaurant.restaurantCandidateId;

    if (!candidateId) {
      throw new Error('restaurantCandidateId is required for verification.');
    }

    const restaurantData: Partial<Restaurant> = { ...restaurant };
    delete restaurantData.id;
    delete restaurantData.unsaved;
    delete restaurantData.restaurantCandidateId;
    delete restaurantData.biteIds;
    delete restaurantData.bites;

    const result = await FirebaseFunctions.callByName<
      VerifyRestaurantCandidateRequest,
      VerifyRestaurantCandidateResult
    >({
      name: 'verifyRestaurantCandidate',
      data: {
        candidateId,
        restaurant: restaurantData,
      },
    });

    const verification = result.data;

    if (
      verification.status === 'created' &&
      restaurant.image &&
      isBase64String(restaurant.image)
    ) {
      await this.api.saveRestaurantImage(
        verification.restaurantId,
        restaurant.image,
      );
    }

    return verification;
  }
}

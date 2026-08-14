import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Address,
  DaySchedule,
  Geopoint,
  GooglePlace,
  Link,
  PlaceDetails,
  Restaurant,
} from 'model';
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
  /** Number of menu items the backend derived from the candidate Bites. */
  menuItemCount?: number;
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

  /** The restaurant currently being edited, from the shared store. */
  restaurant = toSignal(this.storeService.restaurant$);

  submitNewRestaurant(restaurant: Restaurant): void {
    this.storeService.saveNewRestaurant(restaurant);
  }

  createMenuForRestaurant(restaurantId: string): Promise<string> {
    return this.api.createMenuForRestaurant(restaurantId);
  }

  async submitSocialMediaLinks(
    restaurantId: string,
    links: Link[],
  ): Promise<void> {
    await this.api.saveSocialMediaLinksForRestaurant(restaurantId, links);
  }

  async submitDescription(
    restaurantId: string,
    description: string,
  ): Promise<void> {
    await this.api.saveDescriptionForRestaurant(restaurantId, description);
  }

  async submitOpeningHours(
    restaurantId: string,
    openingHours: DaySchedule[],
  ): Promise<void> {
    await this.api.saveOpeningHoursForRestaurant(restaurantId, openingHours);
  }

  async submitAddress(restaurantId: string, address: Address): Promise<void> {
    await this.api.saveAddressForRestaurant(restaurantId, address);
  }

  async submitPosition(
    restaurantId: string,
    position: Geopoint,
  ): Promise<void> {
    await this.api.savePositionForRestaurant(restaurantId, position);
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

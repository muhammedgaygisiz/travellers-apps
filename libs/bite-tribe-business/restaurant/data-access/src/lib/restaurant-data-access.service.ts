import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Address, DaySchedule, Geopoint, Link } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable({
  providedIn: 'root',
})
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  /** The restaurant currently being edited, from the shared store. */
  restaurant = toSignal(this.storeService.restaurant$);

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
}

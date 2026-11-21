import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Address,
  DaySchedule,
  Geopoint,
  Link,
  RestaurantCategory,
  TableOrderingSettings,
} from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { awaitsMenuLink } from 'model';

@Injectable({
  providedIn: 'root',
})
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  /** The restaurant currently being edited, from the shared store. */
  restaurant = toSignal(this.storeService.restaurant$);

  /**
   * How many of the restaurant's Bites wait for a link to a dish (GitHub
   * issue #2216), for the count on the Guest Bites button.
   */
  async countBitesAwaitingMenuLink(restaurantId: string): Promise<number> {
    const bites = await this.api.loadBitesForRestaurant(restaurantId);

    return bites.filter(awaitsMenuLink).length;
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

  async submitTableOrderingSettings(
    restaurantId: string,
    tableOrdering: TableOrderingSettings,
  ): Promise<void> {
    await this.api.saveTableOrderingForRestaurant(restaurantId, tableOrdering);
  }

  async submitGenderNeutralRestroom(
    restaurantId: string,
    genderNeutralRestroom: boolean | undefined,
  ): Promise<void> {
    await this.api.saveGenderNeutralRestroomForRestaurant(
      restaurantId,
      genderNeutralRestroom,
    );
  }

  async submitCategories(
    restaurantId: string,
    categories: RestaurantCategory[],
  ): Promise<void> {
    await this.api.saveCategoriesForRestaurant(restaurantId, categories);
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

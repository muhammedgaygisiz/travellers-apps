import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { Link, Restaurant } from 'model';
import { MENU_COLLECTION } from '../menu-api/menu-api.service';
import { BITE_COLLECTION, RESTAURANT_COLLECTION } from '../utils/constants';
import { getRestaurantById } from './utils/get-restaurant-by-id';

@Injectable({ providedIn: 'root' })
export class RestaurantApiService {
  loadRestaurantById(restaurantId: string): Promise<Restaurant | undefined> {
    return getRestaurantById(restaurantId);
  }

  async saveNewRestaurant(restaurant: Restaurant): Promise<void> {
    // Remove biteIds from the restaurant object before saving
    // console.debug('Restaurant to be saved: ', restaurant);
    const { biteIds, ...restaurantToBeSaved } = restaurant;

    // Add the new restaurant
    const addRestaurantResult = await FirebaseFirestore.addDocument({
      reference: RESTAURANT_COLLECTION,
      data: {
        ...restaurantToBeSaved,
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    const newRestaurantId = addRestaurantResult.reference.id;

    // Add a new menu for the restaurant
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
        categories: [],
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    // Update the restaurant with the menu ID
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${newRestaurantId}`,
      data: {
        menuId: `/menus/${addMenuResult.reference.id}`,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });

    // Update the bites with the new restaurant ID
    if (biteIds && biteIds.length > 0) {
      await Promise.all(
        biteIds.map((biteId) =>
          FirebaseFirestore.updateDocument({
            reference: `${BITE_COLLECTION}/${biteId}`,
            data: {
              restaurantId: `/restaurants/${newRestaurantId}`,
              updatedAt: new Date().toISOString(),
              updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
            },
          }),
        ),
      );
    }
  }

  async saveSocialMediaLinksForRestaurant(
    restaurantId: string,
    links: Link[],
  ): Promise<void> {
    // Update the restaurant with the social media links
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        socialMediaLinks: links,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });
  }
}

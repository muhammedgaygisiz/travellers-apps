import { inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import { EMPTY, from, Observable, skipWhile, switchMap } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { Link, Restaurant } from 'model';
import { MENU_COLLECTION } from '../menu-api.service';
import { BITE_COLLECTION } from '../utils/constants';

const RESTAURANT_COLLECTION = 'restaurants';

@Injectable({ providedIn: 'root' })
export class RestaurantApiService {
  private readonly authService = inject(AuthService);

  loadRestaurant(restaurantId: string): Observable<Restaurant | undefined> {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        if (restaurantId) {
          return from(this.getRestaurantById(restaurantId));
        }

        return EMPTY;
      }),
    );
  }

  async getRestaurantById(
    restaurantId: string,
  ): Promise<Restaurant | undefined> {
    try {
      // First try to get by ID
      const doc = await FirebaseFirestore.getDocument({
        reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      });

      if (doc.snapshot.data) {
        const data = doc.snapshot.data;
        return {
          id: data?.['id'] || restaurantId,
          ...data,
        } as Restaurant;
      }

      // If no restaurant found by ID, try to find by name
      const queryResult = await FirebaseFirestore.getCollection({
        reference: RESTAURANT_COLLECTION,
        queryConstraints: [
          {
            type: 'limit',
            limit: 10,
          },
        ],
      });

      const restaurantName = decodeURIComponent(restaurantId);
      const matchingRestaurant = queryResult.snapshots?.find(
        (snapshot) =>
          snapshot.data?.['name']?.toLowerCase() ===
          restaurantName.toLowerCase(),
      );

      if (matchingRestaurant) {
        const data = matchingRestaurant.data;
        return {
          id: data?.['id'] || matchingRestaurant.id,
          ...data,
        } as Restaurant;
      }

      return undefined;
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      return undefined;
    }
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

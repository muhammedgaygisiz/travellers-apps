import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  EMPTY,
  from,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Link, Restaurant } from 'model';
import { MENU_COLLECTION } from './menu-api.service';
import { BITE_COLLECTION } from './bite-api.service';

const RESTAURANT_COLLECTION = 'restaurants';

@Injectable({ providedIn: 'root' })
export class RestaurantApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly restaurantsChannel$ = new BehaviorSubject<any[]>([]);

  private readonly stopped$ = new Subject<void>();
  restaurantsCallbackId = '';

  public allRestaurants$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap((isLoggedIn) => {
      if (isLoggedIn) {
        this.startRestaurantsListener();
      } else {
        this.stopRestaurantListener(this.restaurantsCallbackId);
      }

      return this.restaurantsChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async startRestaurantsListener() {
    this.restaurantsCallbackId =
      await FirebaseFirestore.addCollectionSnapshotListener(
        { reference: RESTAURANT_COLLECTION },
        async (restaurantsDocs) => {
          // console.debug(
          //   '#mo Fetched restaurants from Firestore',
          //   restaurantsDocs
          // );

          const restaurants =
            restaurantsDocs?.snapshots.map((doc) => ({
              ...doc.data,
              id: doc.id,
            })) || [];

          this.restaurantsChannel$.next(restaurants);
        }
      );
  }

  private async stopRestaurantListener(callbackId: string) {
    this.stopped$.next();
    if (callbackId) {
      await FirebaseFirestore.removeSnapshotListener({ callbackId });
    }
  }

  loadRestaurant(restaurantId: string) {
    return this.authService.isLoggedIn$.pipe(
      skipWhile((isLoggedIn) => !isLoggedIn),
      switchMap(() => {
        // console.debug('#mo - Start Listener for Restaurant');
        if (restaurantId) {
          return from(this.getRestaurantById(restaurantId));
        }

        return EMPTY;
      })
    );
  }

  private async getRestaurantById(restaurantId: string) {
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
          restaurantName.toLowerCase()
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

  async saveNewRestaurant(restaurant: Restaurant) {
    // console.debug('Restaurant to be saved: ', restaurant);
    const { biteIds, ...restaurantToBeSaved } = restaurant;

    // Add the new restaurant
    const addRestaurantResult = await FirebaseFirestore.addDocument({
      reference: RESTAURANT_COLLECTION,
      data: {
        ...restaurantToBeSaved,
      },
    });

    const newRestaurantId = addRestaurantResult.reference.id;

    // Add a new menu for the restaurant
    const addMenuResult = await FirebaseFirestore.addDocument({
      reference: MENU_COLLECTION,
      data: {
        categories: [],
      },
    });

    // Update the restaurant with the menu ID
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${newRestaurantId}`,
      data: {
        menuId: `/menus/${addMenuResult.reference.id}`,
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
            },
          })
        )
      );
    }
  }

  async saveSocialMediaLinksForRestaurant(restaurantId: string, links: Link[]) {
    await FirebaseFirestore.updateDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
      data: {
        socialMediaLinks: links,
      },
    });
  }
}

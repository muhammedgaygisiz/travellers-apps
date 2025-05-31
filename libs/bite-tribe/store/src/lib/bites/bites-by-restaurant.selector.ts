import { createSelector } from '@ngrx/store';
import { restaurant } from '../restaurants/selectors';
import { bites } from './selectors';
import { restaurantId } from '../router/selectors';

export const bitesByRestaurant = createSelector(
  bites,
  restaurantId,
  restaurant,
  (bites, restaurantId, restaurant) => {
    if (!restaurant && !restaurantId) {
      return [];
    }

    if (restaurant) {
      const normalizedRestaurantName = restaurant?.name.toLowerCase().trim();

      return bites.filter((bite) => {
        const normalizedBitePlace = bite.place.toLowerCase().trim();

        return (
          bite.restaurantId?.includes(restaurant.id) ||
          normalizedBitePlace.includes(normalizedRestaurantName) ||
          normalizedRestaurantName?.includes(normalizedBitePlace)
        );
      });
    }

    if (restaurantId) {
      const restaurantIdOrName = decodeURIComponent(restaurantId);
      const normalizedRestaurantIdOrName = restaurantIdOrName
        .toLowerCase()
        .trim();

      return bites.filter((bite) => {
        const normalizedBitePlace = bite.place.toLowerCase().trim();
        return normalizedBitePlace === normalizedRestaurantIdOrName;
      });
    }

    return [];
  }
);

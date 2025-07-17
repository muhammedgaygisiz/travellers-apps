import { createSelector } from '@ngrx/store';
import { restaurant } from '../restaurants/selectors';
import { bites } from './selectors';
import { restaurantId } from '../router/selectors';
import { normalize } from 'utils';

export const bitesByRestaurant = createSelector(
  bites,
  restaurantId,
  restaurant,
  (bites, restaurantId, restaurant) => {
    if (!restaurant && !restaurantId) {
      return [];
    }

    if (restaurant) {
      const normalizedRestaurantName = normalize(restaurant?.name);

      return bites.filter((bite) => {
        const normalizedBitePlace = normalize(bite.place);

        return (
          bite.restaurantId?.includes(restaurant.id) ||
          normalizedBitePlace.includes(normalizedRestaurantName) ||
          normalizedRestaurantName?.includes(normalizedBitePlace)
        );
      });
    }

    if (restaurantId) {
      const restaurantIdOrName = decodeURIComponent(restaurantId);
      const normalizedRestaurantIdOrName = normalize(restaurantIdOrName);

      return bites.filter((bite) => {
        const normalizedBitePlace = normalize(bite.place);
        return normalizedBitePlace === normalizedRestaurantIdOrName;
      });
    }

    return [];
  }
);

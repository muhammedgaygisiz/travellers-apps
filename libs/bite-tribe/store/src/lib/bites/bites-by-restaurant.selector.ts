import { createSelector } from '@ngrx/store';
import { restaurant } from '../restaurants/selectors';
import { bites } from './selectors';
import { restaurantId } from '../router/selectors';
import { normalize } from 'utils';
import { getBitesByRestaurantName } from './utils/get-bites-by-restaurant-name';
import { getBitesByRestaurantIdOrName } from './utils/get-bites-by-restaurant-id-or-name';

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

      return getBitesByRestaurantName(
        normalizedRestaurantName,
        bites,
        restaurant.id
      );
    }

    if (restaurantId) {
      const restaurantIdOrName = decodeURIComponent(restaurantId);
      const normalizedRestaurantIdOrName = normalize(restaurantIdOrName);

      return getBitesByRestaurantIdOrName(normalizedRestaurantIdOrName, bites);
    }

    return [];
  }
);

import { createSelector } from '@ngrx/store';
import { restaurant } from '../restaurants/selectors';
import { bite, bites } from './selectors';
import { restaurantId } from '../router/selectors';
import { normalize } from 'utils';
import { getBitesByRestaurantName } from './utils/get-bites-by-restaurant-name';
import { getBitesByRestaurantIdOrName } from './utils/get-bites-by-restaurant-id-or-name';
import { getCloseBites } from './utils/get-close-bites';
import type { Bite } from 'model';

export const bitesByRestaurant = createSelector(
  bites,
  restaurantId,
  restaurant,
  bite,
  (bites, restaurantIdOrName, restaurant, sourceBite): Bite[] => {
    if (!restaurant && !restaurantIdOrName) {
      return [];
    }

    const possiblyCloseBites = getCloseBites(sourceBite, bites);

    if (restaurant?.name) {
      const normalizedRestaurantName = normalize(restaurant.name);

      const bitesByRestaurant = getBitesByRestaurantName(
        normalizedRestaurantName,
        possiblyCloseBites,
        restaurant.id,
      );

      if (
        sourceBite &&
        !bitesByRestaurant.find((bite) => bite.id === sourceBite?.id)
      ) {
        return [sourceBite, ...bitesByRestaurant];
      }

      return bitesByRestaurant;
    }

    if (restaurantIdOrName) {
      const decodedRestaurantIdOrName = decodeURIComponent(restaurantIdOrName);
      const normalizedRestaurantIdOrName = normalize(decodedRestaurantIdOrName);

      const bitesByRestaurantIdOrName = getBitesByRestaurantIdOrName(
        normalizedRestaurantIdOrName,
        possiblyCloseBites,
      );

      if (
        sourceBite &&
        !bitesByRestaurantIdOrName.find(
          (bite: Bite) => bite.id === sourceBite?.id,
        )
      ) {
        return [sourceBite, ...bitesByRestaurantIdOrName];
      }

      return bitesByRestaurantIdOrName;
    }

    return [];
  },
);

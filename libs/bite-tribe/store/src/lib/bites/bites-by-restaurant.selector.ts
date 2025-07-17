import { createSelector } from '@ngrx/store';
import { restaurant } from '../restaurants/selectors';
import { bites } from './selectors';
import { restaurantId } from '../router/selectors';
import { normalize } from 'utils';
import { search } from 'fast-fuzzy';

const FUZZY_THRESHOLD = 0.8;

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

        // Use fast-fuzzy to match restaurant names with a threshold
        const similarityScore = search(
          normalizedBitePlace,
          [normalizedRestaurantName],
          {
            returnMatchData: true,
            threshold: FUZZY_THRESHOLD, // Adjust threshold as needed (0-1)
          }
        );

        return (
          bite.restaurantId?.includes(restaurant.id) ||
          similarityScore.length > 0
        );
      });
    }

    if (restaurantId) {
      const restaurantIdOrName = decodeURIComponent(restaurantId);
      const normalizedRestaurantIdOrName = normalize(restaurantIdOrName);

      return bites.filter((bite) => {
        const normalizedBitePlace = normalize(bite.place);

        if (normalizedBitePlace === normalizedRestaurantIdOrName) {
          return true;
        }

        // Use fast-fuzzy to match restaurant names with a threshold
        const similarityScore = search(
          normalizedBitePlace,
          [normalizedRestaurantIdOrName],
          {
            returnMatchData: true,
            threshold: FUZZY_THRESHOLD, // Adjust threshold as needed (0-1)
          }
        );

        return (
          bite.restaurantId?.includes(normalizedRestaurantIdOrName) ||
          similarityScore.length > 0
        );
      });
    }

    return [];
  }
);

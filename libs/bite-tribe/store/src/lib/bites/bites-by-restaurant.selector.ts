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
      return bites.filter((bite) => {
        return (
          bite.restaurantId?.includes(restaurant.id) ||
          bite.place
            .toLowerCase()
            .trim()
            .includes(restaurant?.name.toLowerCase().trim()) ||
          restaurant?.name
            .toLowerCase()
            .trim()
            .includes(bite.place.toLowerCase().trim())
        );
      });
    }

    if (restaurantId) {
      const restaurantIdOrName = decodeURIComponent(restaurantId);
      return bites.filter((bite) => {
        return (
          bite.place.toLowerCase().trim() ===
          restaurantIdOrName.toLowerCase().trim()
        );
      });
    }

    return [];
  }
);

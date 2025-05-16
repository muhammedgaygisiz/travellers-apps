import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import { Restaurant } from 'model';
import { restaurantId } from '../router/selectors';
import { adapter } from './adapter';
import { gpsPosition } from '../app/selectors';
import { haversineDistance } from 'distance-pipe';

const slice = createFeatureSelector<EntityState<Restaurant>>(key);

const { selectAll } = adapter.getSelectors();

const allRestaurants = createSelector(slice, selectAll);

const getRestaurant = (restaurants: Restaurant[], id: string) => {
  const foundRestaurantById = restaurants.find((restaurant) => {
    if (id) {
      return restaurant.id.toLowerCase().includes(id.toLowerCase());
    }

    return false;
  });

  if (foundRestaurantById) {
    return foundRestaurantById;
  }

  const restaurantName = decodeURIComponent(id);
  return restaurants.find((restaurant) => {
    return (
      restaurant.name.toLowerCase().includes(restaurantName.toLowerCase()) ||
      restaurantName.toLowerCase().includes(restaurant.name.toLowerCase())
    );
  });
};

export const restaurant = createSelector(
  restaurantId,
  allRestaurants,
  gpsPosition,
  (id, restaurants, gpsPosition) => {
    const foundRestaurantById = getRestaurant(restaurants, id);

    if (foundRestaurantById && gpsPosition) {
      return {
        ...foundRestaurantById,
        distance: haversineDistance(
          foundRestaurantById.position?.latitude,
          foundRestaurantById.position?.longitude,
          gpsPosition?.latitude,
          gpsPosition?.longitude,
          'km'
        ),
      };
    }

    return undefined;
  }
);

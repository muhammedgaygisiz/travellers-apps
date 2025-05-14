import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import { Restaurant } from 'model';
import { restaurantId } from '../router/selectors';
import { adapter } from '../restaurant/adapter';
import { gpsPosition } from '../app/selectors';
import { haversineDistance } from 'distance-pipe';

const slice = createFeatureSelector<EntityState<Restaurant>>(key);

const { selectAll } = adapter.getSelectors();

const allRestaurants = createSelector(slice, selectAll);

export const restaurant = createSelector(
  restaurantId,
  allRestaurants,
  gpsPosition,
  (id, restaurants, gpsPosition) => {
    const foundRestaurant = restaurants.find(
      (restaurant) => restaurant.id === id
    );

    if (foundRestaurant) {
      return {
        ...foundRestaurant,
        distance: haversineDistance(
          foundRestaurant.position.latitude,
          foundRestaurant.position.longitude,
          gpsPosition?.latitude,
          gpsPosition?.longitude,
          'km'
        ),
      };
    }

    return undefined;
  }
);

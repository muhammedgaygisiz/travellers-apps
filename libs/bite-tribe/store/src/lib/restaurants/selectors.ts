import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import { Restaurant } from 'model';
import { restaurantId } from '../router/selectors';
import { adapter } from './adapter';
import { gpsPosition } from '../app/selectors';
import { haversineDistance } from 'distance-pipe';
import { bites } from '../bites/selectors';

const slice = createFeatureSelector<EntityState<Restaurant>>(key);

const { selectAll } = adapter.getSelectors();

const allRestaurants = createSelector(slice, selectAll);

export const restaurants = createSelector(
  allRestaurants,
  gpsPosition,
  bites,
  (restaurants, gpsPosition, bites) => {
    const savedRestaurants = restaurants.map((restaurant) => {
      return {
        ...restaurant,
        distance: haversineDistance(
          restaurant.position.latitude,
          restaurant.position.longitude,
          gpsPosition?.latitude,
          gpsPosition?.longitude,
          'km'
        ),
      } as Restaurant;
    });

    const unsavedRestaurants =
      bites
        .filter((bite) => !bite.restaurantId)
        .reduce((uniqueRestaurants, bite) => {
          const existingRestaurant = uniqueRestaurants.find(
            (r) => r.name === bite.place
          );

          if (existingRestaurant && existingRestaurant.biteIds) {
            existingRestaurant.biteIds.push(bite.id);
          } else {
            uniqueRestaurants.push({
              name: bite.place,
              distance: haversineDistance(
                bite.position?.latitude,
                bite.position?.longitude,
                gpsPosition?.latitude,
                gpsPosition?.longitude,
                'km'
              ),
              unsaved: true,
              biteIds: [bite.id], // Include the bite ID
            } as Restaurant);
          }
          return uniqueRestaurants;
        }, [] as Restaurant[]) || [];

    return [...savedRestaurants, ...unsavedRestaurants];
  }
);

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

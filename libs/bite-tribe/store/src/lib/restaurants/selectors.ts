import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import type { Restaurant } from 'model';
import { restaurantId } from '../router/selectors';
import { adapter, RestaurantState } from './adapter';
import { gpsPosition } from '../app/selectors';
import { haversineDistance } from 'utils';
import { bites } from '../bites/home-bites.selector';
import { getRestaurant } from './utils/get-restaurant';

const slice = createFeatureSelector<RestaurantState>(key);

const { selectAll } = adapter.getSelectors();

const allRestaurants = createSelector(slice, selectAll);

export const restaurants = createSelector(
  allRestaurants,
  gpsPosition,
  bites,
  (restaurants, gpsPosition, bites) => {
    const savedRestaurantsWithDistances = restaurants.map((restaurant) => {
      return {
        ...restaurant,
        distance: haversineDistance(
          restaurant.position.latitude,
          restaurant.position.longitude,
          gpsPosition?.latitude,
          gpsPosition?.longitude,
          'km',
        ),
      } as Restaurant;
    });

    const savedRestaurantNames = savedRestaurantsWithDistances.map(
      (restaurant) => restaurant.name,
    );

    const unsavedRestaurants =
      bites
        .filter((bite) => !bite.restaurantId)
        .reduce((uniqueRestaurants, bite) => {
          const existingRestaurant = uniqueRestaurants.find(
            (r) =>
              r.name.toLowerCase().trim() === bite.place.toLowerCase().trim(),
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
                'km',
              ),
              unsaved: true,
              biteIds: [bite.id], // Include the bite ID
            } as Restaurant);
          }
          return uniqueRestaurants;
        }, [] as Restaurant[])
        .filter(
          (restaurant) =>
            !savedRestaurantNames.includes(restaurant.name.trim()),
        ) || [];

    return [...savedRestaurantsWithDistances, ...unsavedRestaurants];
  },
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
          'km',
        ),
      };
    }

    return undefined;
  },
);

const selectedRestaurantToCreate = createSelector(
  slice,
  (slice) => slice.restaurantToCreate,
);

export const restaurantToCreate = createSelector(
  selectedRestaurantToCreate,
  bites,
  (restaurantToCreate, bites) => {
    const bitesOfRestaurant = restaurantToCreate.biteIds?.map((biteId) =>
      bites.find((b) => b.id === biteId),
    );

    return {
      ...restaurantToCreate,
      bites: bitesOfRestaurant,
    } as Restaurant;
  },
);

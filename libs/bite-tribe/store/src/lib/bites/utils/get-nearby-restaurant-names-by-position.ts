import { Bite } from 'model';
import { getNearbyBites } from './get-nearby-bites';
import { getUniqueRestaurantNames } from './get-unique-restaurant-names';

export const getNearbyRestaurantNamesByPosition = (bites: Bite[]): string[] => {
  if (!bites) {
    return [];
  }

  const nearbyBites = getNearbyBites(bites);
  const restaurantNames = getUniqueRestaurantNames(nearbyBites);

  return Array.from(restaurantNames).sort();
};

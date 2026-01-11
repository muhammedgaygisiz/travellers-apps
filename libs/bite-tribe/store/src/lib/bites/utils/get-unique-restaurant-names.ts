import { containsFuzzyEqualRestaurantName } from './contains-fuzzy-equal-restaurant-name';
import { Bite } from 'model';

export const getUniqueRestaurantNames = (bites: Bite[]): Set<string> => {
  const restaurantNames = new Set<string>();

  bites.forEach((bite) => {
    const restaurantName = bite.place && bite.place.trim();

    const listContainsFuzzyEqualRestaurantName =
      containsFuzzyEqualRestaurantName(
        restaurantName,
        Array.from(restaurantNames),
      );

    if (restaurantName && !listContainsFuzzyEqualRestaurantName) {
      restaurantNames.add(restaurantName);
    }
  });

  return restaurantNames;
};

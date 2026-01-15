import { isSimilar } from './is-similar';

export const containsFuzzyEqualRestaurantName = (
  restaurantName: string,
  restaurantNames: string[],
): boolean => restaurantNames.some((name) => isSimilar(name, restaurantName));

import type { Bite, NearbyRestaurant } from 'model';
import { getNearbyBites } from './get-nearby-bites';
import { getUniqueRestaurantNames } from './get-unique-restaurant-names';
import { isSimilar } from './is-similar';

const parseDistance = (distance?: string): number =>
  distance ? parseFloat(distance) : Infinity;

/**
 * Builds the nearby restaurant options from nearby bites: one entry per unique
 * (fuzzy-deduped) restaurant name, carrying the position/distance of its
 * nearest bite and the verified restaurant id when any of its bites has one.
 */
export const getNearbyRestaurantsByPosition = (
  bites: Bite[],
): NearbyRestaurant[] => {
  if (!bites?.length) {
    return [];
  }

  const nearbyBites = getNearbyBites(bites);
  const uniqueNames = Array.from(getUniqueRestaurantNames(nearbyBites));

  return uniqueNames
    .map((name): NearbyRestaurant => {
      const matchingBites = nearbyBites
        .filter((bite) => !!bite.place && isSimilar(bite.place, name))
        .sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));

      const nearestBite = matchingBites[0];
      const verifiedBite = matchingBites.find((bite) => !!bite.restaurantId);

      return {
        name,
        position: nearestBite?.position,
        distance: nearestBite?.distance,
        restaurantId: verifiedBite?.restaurantId,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

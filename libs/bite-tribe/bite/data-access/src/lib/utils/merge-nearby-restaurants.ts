import type { Geopoint, NearbyRestaurant, Restaurant } from 'model';
import { haversineDistance } from 'utils';

const sameName = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Today's Bite-derived nearby list, with the stored restaurants near the guest
 * added (GitHub issue #2308). A restaurant set up in the business app with no
 * Bite yet used to be missing, so its first guest added it again by name.
 *
 * A stored restaurant already in the list - by id, or by name for a Bite that
 * never linked one - is not repeated; a name match without an id gains the
 * stored id, so picking it links the Bite to that restaurant. The result is in
 * name order, like the Bite-derived list.
 */
export const mergeNearbyRestaurants = (
  fromBites: readonly NearbyRestaurant[],
  stored: readonly Restaurant[],
  position: Geopoint | null | undefined,
): NearbyRestaurant[] => {
  const merged = fromBites.map((entry) => ({ ...entry }));

  for (const restaurant of stored) {
    if (!restaurant.name?.trim()) {
      continue;
    }

    const known = merged.find(
      (entry) =>
        (!!entry.restaurantId && entry.restaurantId === restaurant.id) ||
        sameName(entry.name, restaurant.name),
    );

    if (known) {
      known.restaurantId ??= restaurant.id;
      continue;
    }

    merged.push({
      name: restaurant.name,
      position: restaurant.position,
      restaurantId: restaurant.id,
      distance: haversineDistance(
        restaurant.position?.latitude,
        restaurant.position?.longitude,
        position?.latitude ?? undefined,
        position?.longitude ?? undefined,
        'km',
      ),
    });
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
};

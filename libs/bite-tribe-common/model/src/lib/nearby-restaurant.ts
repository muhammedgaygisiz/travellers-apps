import type { Geopoint } from './geopoint';

/**
 * A restaurant derived from nearby bites, offered in the restaurant selector.
 * Carries the representative position (nearest bite) so selecting it can patch
 * the bite position, plus optional distance and the verified restaurant id.
 */
export interface NearbyRestaurant {
  name: string;
  position?: Geopoint;
  distance?: string;
  restaurantId?: string;
}

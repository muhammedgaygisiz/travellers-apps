import type { Geopoint, NearbyRestaurant } from 'model';
import { haversineDistance } from 'utils';

/**
 * How far a locally known restaurant may sit from the Bite's own position and
 * still be a plausible answer to "which place does this Bite belong to".
 *
 * The same 15 km the Home feed uses to decide which Bites count as nearby, so a
 * Bite posted where the user is standing keeps exactly the candidate list it had
 * before GitHub issue #1307 and still spends no Google callable. Measured from
 * the Bite rather than from the device, which is the whole point: the local list
 * is sourced around the device, so for a Bite 1535 km away every candidate in it
 * is wrong. See GitHub issue #1307.
 */
export const NEAR_BITE_RADIUS_KM = 15;

const distanceInKm = (from?: Geopoint, to?: Geopoint): number | undefined => {
  if (!from || !to) {
    return undefined;
  }

  const km = haversineDistance(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude,
    'km',
  );

  return km === undefined ? undefined : parseFloat(km);
};

/**
 * The local candidates worth offering for this Bite: the ones within
 * {@link NEAR_BITE_RADIUS_KM} of it, plus the ones there is no way to measure.
 *
 * A candidate without a position of its own is not known to be far, so it stays
 * offered; a Bite without a position cannot rank anything, so the list is passed
 * through untouched.
 */
export const getRestaurantsNearBite = (
  restaurants: NearbyRestaurant[],
  bitePosition?: Geopoint,
): NearbyRestaurant[] => {
  if (!bitePosition) {
    return restaurants;
  }

  return restaurants.filter((restaurant) => {
    const distance = distanceInKm(bitePosition, restaurant.position);

    return distance === undefined || distance <= NEAR_BITE_RADIUS_KM;
  });
};

/**
 * Whether the local list actually answers the question for this Bite, which is
 * what decides if the Google lookup is worth a callable.
 *
 * Stricter than {@link getRestaurantsNearBite} on purpose: only a candidate that
 * can be *proven* near the Bite counts. Letting an unmeasurable candidate count
 * would suppress the Google lookup the same way a full Bern list used to
 * suppress it for a Bite in Ronda.
 */
export const hasRestaurantNearBite = (
  restaurants: NearbyRestaurant[],
  bitePosition?: Geopoint,
): boolean =>
  restaurants.some((restaurant) => {
    const distance = distanceInKm(bitePosition, restaurant.position);

    return distance !== undefined && distance <= NEAR_BITE_RADIUS_KM;
  });

import { getSimilarityScore } from './get-similarity-score';
import { haversineDistance } from './haversine-distance';
import { normalize } from './normalize';

/**
 * Which Bites belong to a restaurant: the one rule the consumer restaurant
 * page and the owner's dashboard both read, so the figures an owner sees are
 * the ones a guest sees (GitHub issue #2133). The types are structural
 * because this library sits below the BiteTribe model.
 */

/** How far from the centre a Bite can be and still be at the place. */
export const MAX_RESTAURANT_DISTANCE_METERS = 200;

interface Point {
  latitude: number;
  longitude: number;
}

/** What the rule reads of a Bite. */
export interface RestaurantBiteLike {
  place?: string;
  restaurantId?: string;
  position?: Point;
  rating?: number | null;
}

/** What the rule reads of a restaurant. */
export interface RestaurantLike {
  id?: string;
  name?: string;
}

/** The Bites close enough to `center` to have been eaten at one place. */
export const closeTo = <T extends RestaurantBiteLike>(
  bites: T[],
  center: Point,
): T[] =>
  bites.filter((bite) => {
    if (!bite.position) {
      return false;
    }

    const dist = Number(
      haversineDistance(
        center.latitude,
        center.longitude,
        bite.position.latitude,
        bite.position.longitude,
        'm',
      ),
    );

    return dist <= MAX_RESTAURANT_DISTANCE_METERS;
  });

/**
 * Which of the close Bites belong to the place: linked to the restaurant or
 * named like it, or named like `fallbackName` when no restaurant was read.
 */
export const matchRestaurantBites = <T extends RestaurantBiteLike>(
  closeBites: T[],
  restaurant: RestaurantLike | undefined,
  fallbackName: string | undefined,
): T[] => {
  if (restaurant?.name) {
    const normalizedName = normalize(restaurant.name);
    const restaurantId = restaurant.id;

    return closeBites.filter((bite) => {
      const score = getSimilarityScore(
        normalize(bite.place ?? ''),
        normalizedName,
      );
      return (
        (restaurantId !== undefined &&
          !!bite.restaurantId?.includes(restaurantId)) ||
        score.length > 0
      );
    });
  }

  if (fallbackName) {
    const normalizedName = normalize(decodeURIComponent(fallbackName));

    return closeBites.filter((bite) => {
      const normalizedBitePlace = normalize(bite.place ?? '');
      if (normalizedBitePlace === normalizedName) {
        return true;
      }
      const score = getSimilarityScore(normalizedBitePlace, normalizedName);
      return !!bite.restaurantId?.includes(normalizedName) || score.length > 0;
    });
  }

  return closeBites;
};

/** The Bites that carry a rating; 0 and a missing one do not count. */
export const ratedBitesOf = <T extends RestaurantBiteLike>(
  bites: T[],
): (T & { rating: number })[] =>
  bites.filter(
    (bite): bite is T & { rating: number } =>
      bite.rating !== undefined && bite.rating !== null && bite.rating !== 0,
  );

/** The average rating to one decimal, or 0 without a rated Bite. */
export const averageRatingOf = (bites: RestaurantBiteLike[]): number => {
  const rated = ratedBitesOf(bites);
  const total = rated.reduce((sum, bite) => sum + bite.rating, 0);
  const average = rated.length > 0 ? total / rated.length : 0;

  return Math.round(average * 10) / 10;
};

import { containsFuzzyEqualRestaurantName } from './contains-fuzzy-equal-restaurant-name';
import { Bite } from 'model';
import { isSimilar } from './is-similar';

const getCandidateWithLongestName = (candidatesArray: string[]): string => {
  if (candidatesArray.length === 0) {
    return '';
  }

  if (candidatesArray.length === 1) {
    return candidatesArray[0];
  }

  return candidatesArray.reduce((a, b) => (a.length > b.length ? a : b));
};

const getLongestFuzzyEqualRestaurantName = (
  place: string,
  places: string[],
): string => {
  const candidates = new Set<string>();

  places.forEach((p) => {
    const name1 = p.length > place.length ? place : p;
    const name2 = p.length > place.length ? p : place;

    if (isSimilar(name1, name2)) {
      candidates.add(p);
    }
  });

  const candidatesArray = Array.from(candidates);

  return getCandidateWithLongestName(candidatesArray);
};

/**
 * The fuzzy dedup compares every place against every other one, and each
 * comparison builds its own search index, so the cost is quadratic in the
 * number of places it is handed. Feeding it one entry per Bite meant a feed of
 * 440 Bites did on the order of 190,000 index builds, which blocked the main
 * thread for over a second every time the selector recomputed - and it
 * recomputes on every like. Identical names cannot produce a different result,
 * so they are collapsed before the quadratic part starts. See GitHub issue
 * #1357.
 */
export const getUniqueRestaurantNames = (bites: Bite[]): Set<string> => {
  const restaurantNames = new Set<string>();

  const places = Array.from(
    new Set(
      bites.map((bite) => bite?.place?.trim()).filter((place) => !!place),
    ),
  ) as string[];

  places.forEach((place) => {
    const listContainsFuzzyEqualRestaurantName =
      containsFuzzyEqualRestaurantName(place, Array.from(restaurantNames));

    if (place && !listContainsFuzzyEqualRestaurantName) {
      const longestFuzzyEqualRestaurantNames =
        getLongestFuzzyEqualRestaurantName(place, places);

      restaurantNames.add(longestFuzzyEqualRestaurantNames);
    }
  });

  return restaurantNames;
};

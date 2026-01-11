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

export const getUniqueRestaurantNames = (bites: Bite[]): Set<string> => {
  const restaurantNames = new Set<string>();

  const places = bites
    .map((bite) => bite?.place?.trim())
    .filter((place) => !!place);

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

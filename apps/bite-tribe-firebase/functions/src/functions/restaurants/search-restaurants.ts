import { DocumentData, QueryDocumentSnapshot, getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';

const MIN_SEARCH_TEXT_LENGTH = 3;
const MAX_RESULTS = 20;

interface SearchRestaurantsRequest {
  searchText?: unknown;
}

interface SearchRestaurant {
  id: string;
  name: string;
  biteId: string;
  restaurantId?: string;
  place?: string;
  image?: string;
  imagePath?: string;
  position?: {
    latitude: number;
    longitude: number;
  };
}

const getString = (
  data: DocumentData,
  field: string,
): string => (typeof data[field] === 'string' ? data[field] : '');

const getStringArray = (
  data: DocumentData,
  field: string,
): string[] => {
  const value = data[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const getPosition = (
  data: DocumentData,
): SearchRestaurant['position'] => {
  const position = data.position;

  if (
    typeof position?.latitude !== 'number' ||
    typeof position?.longitude !== 'number'
  ) {
    return undefined;
  }

  return {
    latitude: position.latitude,
    longitude: position.longitude,
  };
};

const matchesSearchText = (value: string, searchText: string): boolean =>
  value.toLocaleLowerCase().includes(searchText);

const idFromPath = (value: string): string => {
  const segments = value.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? value;
};

const getBiteId = (bite: QueryDocumentSnapshot): string =>
  getString(bite.data(), 'id') || bite.id;

const getNormalizedRestaurantId = (
  data: DocumentData,
): string => {
  const restaurantId = getString(data, 'restaurantId');
  return restaurantId ? idFromPath(restaurantId) : '';
};

const toVerifiedRestaurant = (
  restaurant: QueryDocumentSnapshot,
  biteId: string,
  place?: string,
  position?: SearchRestaurant['position'],
): SearchRestaurant => {
  const data = restaurant.data();
  const image = getString(data, 'image');
  const imagePath = getString(data, 'imagePath');

  return {
    id: restaurant.id,
    name: getString(data, 'name'),
    biteId,
    restaurantId: restaurant.id,
    ...(place ? { place } : {}),
    ...(image ? { image } : {}),
    ...(imagePath ? { imagePath } : {}),
    ...(position ? { position } : {}),
  };
};

const toUnverifiedRestaurant = (
  bite: QueryDocumentSnapshot,
): SearchRestaurant => {
  const data = bite.data();
  const place = getString(data, 'place');
  const image = getString(data, 'image');
  const imagePath = getString(data, 'imagePath');
  const position = getPosition(data);

  return {
    id: `place-${getBiteId(bite)}-${place}`,
    name: place,
    biteId: getBiteId(bite),
    place,
    ...(image ? { image } : {}),
    ...(imagePath ? { imagePath } : {}),
    ...(position ? { position } : {}),
  };
};

export const searchRestaurants = onAppCheck<SearchRestaurantsRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to search for restaurants.',
      );
    }

    if (typeof request.data.searchText !== 'string') {
      throw new HttpsError('invalid-argument', 'searchText must be a string.');
    }

    const searchText = request.data.searchText.trim().toLocaleLowerCase();

    if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
      return [];
    }

    const [restaurantsSnapshot, bitesSnapshot] = await Promise.all([
      getFirestore().collection('restaurants').get(),
      getFirestore().collection('bites').get(),
    ]);
    const bites = bitesSnapshot.docs;
    const results = new Map<string, SearchRestaurant>();

    restaurantsSnapshot.docs
      .filter((doc) =>
        matchesSearchText(getString(doc.data(), 'name'), searchText),
      )
      .forEach((restaurant) => {
        const restaurantBiteIds = getStringArray(
          restaurant.data(),
          'biteIds',
        ).map(idFromPath);
        const sourceBite =
          bites.find(
            (bite) => getNormalizedRestaurantId(bite.data()) === restaurant.id,
          ) ??
          bites.find((bite) => restaurantBiteIds.includes(getBiteId(bite)));
        const biteId = sourceBite
          ? getBiteId(sourceBite)
          : restaurantBiteIds[0];

        if (biteId) {
          results.set(
            `restaurant-${restaurant.id}`,
            toVerifiedRestaurant(
              restaurant,
              biteId,
              sourceBite ? getString(sourceBite.data(), 'place') : undefined,
              sourceBite ? getPosition(sourceBite.data()) : undefined,
            ),
          );
        }
      });

    bites
      .filter((bite) =>
        matchesSearchText(getString(bite.data(), 'place'), searchText),
      )
      .forEach((bite) => {
        const data = bite.data();
        const restaurantId = getNormalizedRestaurantId(data);

        if (restaurantId) {
          const restaurant = restaurantsSnapshot.docs.find(
            (doc) => doc.id === restaurantId,
          );

          if (restaurant) {
            results.set(
              `restaurant-${restaurant.id}`,
              toVerifiedRestaurant(
                restaurant,
                getBiteId(bite),
                getString(data, 'place'),
                getPosition(data),
              ),
            );
          }

          return;
        }

        const place = getString(data, 'place');
        if (place) {
          results.set(
            `place-${place.toLocaleLowerCase()}`,
            toUnverifiedRestaurant(bite),
          );
        }
      });

    return [...results.values()].slice(0, MAX_RESULTS);
  },
);

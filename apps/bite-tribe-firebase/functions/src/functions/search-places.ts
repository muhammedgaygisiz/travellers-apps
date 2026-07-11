import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { onAppCheck } from './callable-options';

const MIN_SEARCH_TEXT_LENGTH = 3;
const MAX_RESULTS = 20;
const MAX_NEARBY_RESULTS = 5;
const LOCATION_BIAS_RADIUS_METERS = 20000;
const NEARBY_SEARCH_RADIUS_METERS = 20000;
const NEARBY_INCLUDED_TYPES = ['restaurant'];
const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';
const GOOGLE_PLACES_TEXT_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_NEARBY_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchNearby';
const GOOGLE_PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

const googleMapsApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

interface Position {
  latitude: number;
  longitude: number;
}

interface SearchPlacesRequest {
  searchText?: unknown;
  position?: unknown;
}

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string;
  position: Position;
}

interface GooglePlaceResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

interface GooglePlacesResponse {
  places?: GooglePlaceResult[];
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const parsePosition = (value: unknown): Position | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { latitude, longitude } = value as {
    latitude?: unknown;
    longitude?: unknown;
  };

  if (isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
    return { latitude, longitude };
  }

  return undefined;
};

export const toGooglePlaces = (
  response: GooglePlacesResponse,
  limit: number = MAX_RESULTS,
): GooglePlace[] =>
  (response.places ?? [])
    .map((place): GooglePlace | undefined => {
      const position = parsePosition(place.location);
      const name = place.displayName?.text;

      if (!position || !name) {
        return undefined;
      }

      return {
        placeId: place.id ?? '',
        name,
        address: place.formattedAddress ?? '',
        position,
      };
    })
    .filter((place): place is GooglePlace => place !== undefined)
    .slice(0, limit);

export const buildRequestBody = (
  searchText: string,
  position?: Position,
): Record<string, unknown> => ({
  textQuery: searchText,
  maxResultCount: MAX_RESULTS,
  ...(position
    ? {
        locationBias: {
          circle: {
            center: position,
            radius: LOCATION_BIAS_RADIUS_METERS,
          },
        },
      }
    : {}),
});

export const buildNearbyRequestBody = (
  position: Position,
): Record<string, unknown> => ({
  includedTypes: NEARBY_INCLUDED_TYPES,
  maxResultCount: MAX_NEARBY_RESULTS,
  rankPreference: 'DISTANCE',
  locationRestriction: {
    circle: {
      center: position,
      radius: NEARBY_SEARCH_RADIUS_METERS,
    },
  },
});

const loadGooglePlaces = async (
  searchText: string,
  position: Position | undefined,
  apiKey: string,
): Promise<GooglePlace[]> => {
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
    },
    body: JSON.stringify(buildRequestBody(searchText, position)),
  });

  if (!response.ok) {
    throw new Error(`Google Places Text Search HTTP ${response.status}`);
  }

  const data = (await response.json()) as GooglePlacesResponse;

  return toGooglePlaces(data);
};

const loadNearbyGooglePlaces = async (
  position: Position,
  apiKey: string,
): Promise<GooglePlace[]> => {
  const response = await fetch(GOOGLE_PLACES_NEARBY_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
    },
    body: JSON.stringify(buildNearbyRequestBody(position)),
  });

  if (!response.ok) {
    throw new Error(`Google Places Nearby Search HTTP ${response.status}`);
  }

  const data = (await response.json()) as GooglePlacesResponse;

  return toGooglePlaces(data, MAX_NEARBY_RESULTS);
};

export const searchPlaces = onAppCheck<SearchPlacesRequest>(
  {
    secrets: [googleMapsApiKey],
  },
  async (request): Promise<GooglePlace[]> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to search for places.',
      );
    }

    if (typeof request.data.searchText !== 'string') {
      throw new HttpsError('invalid-argument', 'searchText must be a string.');
    }

    const searchText = request.data.searchText.trim();

    if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
      return [];
    }

    const apiKey = googleMapsApiKey.value();

    if (!apiKey) {
      throw new Error(`${GOOGLE_GEOCODING_API_KEY_ENV} is not configured.`);
    }

    const position = parsePosition(request.data.position);

    try {
      return await loadGooglePlaces(searchText, position, apiKey);
    } catch (error) {
      logger.warn('searchPlaces: failed to load places from Google', {
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  },
);

interface SearchNearbyPlacesRequest {
  position?: unknown;
}

export const searchNearbyPlaces = onAppCheck<SearchNearbyPlacesRequest>(
  {
    secrets: [googleMapsApiKey],
  },
  async (request): Promise<GooglePlace[]> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to search for places.',
      );
    }

    const position = parsePosition(request.data.position);

    if (!position) {
      throw new HttpsError(
        'invalid-argument',
        'position with valid coordinates is required.',
      );
    }

    const apiKey = googleMapsApiKey.value();

    if (!apiKey) {
      throw new Error(`${GOOGLE_GEOCODING_API_KEY_ENV} is not configured.`);
    }

    try {
      return await loadNearbyGooglePlaces(position, apiKey);
    } catch (error) {
      logger.warn('searchNearbyPlaces: failed to load places from Google', {
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  },
);

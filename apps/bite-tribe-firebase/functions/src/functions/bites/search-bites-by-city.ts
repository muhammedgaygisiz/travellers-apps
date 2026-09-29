import {
  DocumentData,
  QueryDocumentSnapshot,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { distanceBetween, geohashQueryBounds, Geopoint } from 'geofire-common';
import { onAppCheck } from '../shared/callable-options';
import { geocodeAddress, Position } from '../shared/utils/geocode';
import { SearchBite, toSearchBite } from '../shared/utils/search-bite';
import { requireMember } from '../shared/roles';
import { isBiteVisibleTo } from '../shared/utils/bite-listability';

const MIN_SEARCH_TEXT_LENGTH = 3;
const MAX_RESULTS = 20;
const BITE_COLLECTION = 'bites';
const DEFAULT_SEARCH_RADIUS_IN_M = 15 * 1000;
const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';

const googleMapsApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

interface SearchBitesByCityRequest {
  searchText?: unknown;
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const querySingleBound = async (
  bound: [string, string],
): Promise<QueryDocumentSnapshot[]> => {
  try {
    const snapshot = await getFirestore()
      .collection(BITE_COLLECTION)
      .where('geohash', '>=', bound[0])
      .where('geohash', '<=', bound[1])
      .orderBy('geohash', 'asc')
      .get();

    return snapshot.docs;
  } catch {
    return [];
  }
};

const getBitePosition = (data: DocumentData): Position | undefined => {
  const position = data.position;

  if (
    position &&
    isValidCoordinate(position.latitude) &&
    isValidCoordinate(position.longitude)
  ) {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
    };
  }

  return undefined;
};

/**
 * The Bites near one position that the caller may see, up to the cap.
 *
 * Visibility is checked in the same filter as the radius, before the cap, so a
 * city with hidden Bites still fills the page with visible ones (GitHub issue
 * #1717).
 */
export const loadBitesNearPosition = async (
  center: Position,
  viewerUid: string,
): Promise<SearchBite[]> => {
  const centerPoint: Geopoint = [center.latitude, center.longitude];
  const bounds = geohashQueryBounds(centerPoint, DEFAULT_SEARCH_RADIUS_IN_M);
  const snapshots = await Promise.all(bounds.map(querySingleBound));

  return snapshots
    .flat()
    .filter((doc) => {
      const data = doc.data();

      if (!isBiteVisibleTo(data, viewerUid)) {
        return false;
      }

      const position = getBitePosition(data);

      if (!position) {
        return false;
      }

      const distanceInM =
        distanceBetween([position.latitude, position.longitude], centerPoint) *
        1000;

      return distanceInM <= DEFAULT_SEARCH_RADIUS_IN_M;
    })
    .slice(0, MAX_RESULTS)
    .map(toSearchBite);
};

export const searchBitesByCity = onAppCheck<SearchBitesByCityRequest>(
  {
    secrets: [googleMapsApiKey],
  },
  async (request): Promise<SearchBite[]> => {
    requireMember(
      request,
      'You must be signed in to search for bites by city.',
    );

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

    try {
      const position = await geocodeAddress(searchText, apiKey);

      if (!position) {
        return [];
      }

      return await loadBitesNearPosition(position, request.auth.uid);
    } catch (error) {
      logger.warn('searchBitesByCity: failed to load bites for city', {
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  },
);

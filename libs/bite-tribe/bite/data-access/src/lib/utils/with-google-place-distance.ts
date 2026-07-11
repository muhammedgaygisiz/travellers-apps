import type { Geopoint, GooglePlace } from 'model';
import { haversineDistance } from 'utils';

const toDistance = (distance?: string): number => {
  const parsed = distance ? parseFloat(distance) : NaN;
  return Number.isNaN(parsed) ? Infinity : parsed;
};

export const withGooglePlaceDistance = (
  places: GooglePlace[],
  origin?: Geopoint,
): GooglePlace[] =>
  places
    .map((place) => ({
      ...place,
      ...(origin
        ? {
            distance: haversineDistance(
              origin.latitude,
              origin.longitude,
              place.position.latitude,
              place.position.longitude,
            ),
          }
        : {}),
    }))
    .sort((a, b) => toDistance(a.distance) - toDistance(b.distance));

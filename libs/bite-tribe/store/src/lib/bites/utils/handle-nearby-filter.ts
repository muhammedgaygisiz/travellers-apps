import { Bite, Geopoint, Settings } from 'model';

const byDistance = (nearbyDistanceInKm: number) => (bite: Bite) => {
  if (bite.distance) {
    const distance = parseFloat(bite.distance);
    return distance <= nearbyDistanceInKm;
  }

  return true;
};

const toKm = (nearbySetting: number) => nearbySetting / 1000;

export const handleNearbyFilter = (
  distance: number | undefined,
  gpsPosition: Geopoint | undefined,
  appSettings: Settings,
  bites: Bite[]
) => {
  const hasNearbyFilter = distance;
  if (hasNearbyFilter && gpsPosition && hasNearbyFilter) {
    const nearbyDistanceInKm = toKm(hasNearbyFilter);
    return bites.filter(byDistance(nearbyDistanceInKm));
  }

  return bites;
};

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
  filters: string[],
  gpsPosition: Geopoint | undefined,
  appSettings: Settings,
  bites: Bite[]
) => {
  const hasNearbyFilter = filters.includes('nearby');
  if (hasNearbyFilter && gpsPosition && appSettings?.nearby) {
    const nearbyDistanceInKm = toKm(appSettings.nearby);
    return bites.filter(byDistance(nearbyDistanceInKm));
  }

  return bites;
};

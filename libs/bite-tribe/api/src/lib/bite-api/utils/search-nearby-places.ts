import type { Geopoint, GooglePlace } from 'model';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

interface SearchNearbyPlacesRequest {
  position: Geopoint;
}

export const searchNearbyPlaces = async (
  position: Geopoint,
): Promise<GooglePlace[]> => {
  try {
    const result = await FirebaseFunctions.callByName<
      SearchNearbyPlacesRequest,
      GooglePlace[]
    >({
      name: 'searchNearbyPlaces',
      data: { position },
    });

    return result.data;
  } catch {
    return [];
  }
};

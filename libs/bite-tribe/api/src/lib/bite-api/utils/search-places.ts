import type { Geopoint, GooglePlace } from 'model';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

interface SearchPlacesRequest {
  searchText: string;
  position?: Geopoint;
}

export const searchPlaces = async (
  searchText: string,
  position?: Geopoint,
): Promise<GooglePlace[]> => {
  try {
    const result = await FirebaseFunctions.callByName<
      SearchPlacesRequest,
      GooglePlace[]
    >({
      name: 'searchPlaces',
      data: {
        searchText,
        ...(position ? { position } : {}),
      },
    });

    return result.data;
  } catch {
    return [];
  }
};

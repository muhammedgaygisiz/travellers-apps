import type { PlaceDetails } from 'model';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

interface GetPlaceDetailsRequest {
  placeId: string;
}

export const getPlaceDetails = async (
  placeId: string,
): Promise<PlaceDetails | undefined> => {
  try {
    const result = await FirebaseFunctions.callByName<
      GetPlaceDetailsRequest,
      PlaceDetails | null
    >({
      name: 'getPlaceDetails',
      data: { placeId },
    });

    return result.data ?? undefined;
  } catch {
    return undefined;
  }
};

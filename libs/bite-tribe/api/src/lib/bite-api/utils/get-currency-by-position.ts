import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Geopoint } from 'model';

interface GetCurrencyByPositionRequest {
  latitude: number;
  longitude: number;
}

interface GetCurrencyByPositionResult {
  currency: string | null;
}

/**
 * Resolves the currency for a position via the `getCurrencyByPosition` Cloud
 * Function (Google Maps Geocoding → country → currency). Returns `undefined`
 * when no currency could be determined so callers can fall back.
 */
export const getCurrencyByPosition = async (
  position?: Geopoint,
): Promise<string | undefined> => {
  if (!position) {
    return undefined;
  }

  try {
    const result = await FirebaseFunctions.callByName<
      GetCurrencyByPositionRequest,
      GetCurrencyByPositionResult
    >({
      name: 'getCurrencyByPosition',
      data: {
        latitude: position.latitude,
        longitude: position.longitude,
      },
    });

    return result.data.currency ?? undefined;
  } catch {
    return undefined;
  }
};

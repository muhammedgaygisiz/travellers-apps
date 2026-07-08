import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { getAppCheckCallableOptions } from './callable-options';
import { getCurrencyByCountryCode } from './utils/country-code-to-currency';
import { reverseGeocode } from './utils/reverse-geocode';

const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';
const googleGeocodingApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

interface GetCurrencyByPositionRequest {
  latitude?: unknown;
  longitude?: unknown;
}

interface GetCurrencyByPositionResult {
  currency: string | null;
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const getCurrencyByPosition = onCall<GetCurrencyByPositionRequest>(
  {
    ...getAppCheckCallableOptions(),
    secrets: [googleGeocodingApiKey],
  },
  async (request): Promise<GetCurrencyByPositionResult> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to determine the currency.',
      );
    }

    const { latitude, longitude } = request.data;

    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      throw new HttpsError(
        'invalid-argument',
        'latitude and longitude must be numbers.',
      );
    }

    try {
      const address = await reverseGeocode(
        { latitude, longitude },
        googleGeocodingApiKey.value(),
      );
      const currency = getCurrencyByCountryCode(address.countryCode) ?? null;

      logger.info('getCurrencyByPosition: resolved currency', {
        countryCode: address.countryCode,
        currency,
      });

      return { currency };
    } catch (error) {
      logger.warn('getCurrencyByPosition: failed to resolve currency', {
        error: error instanceof Error ? error.message : String(error),
      });

      return { currency: null };
    }
  },
);

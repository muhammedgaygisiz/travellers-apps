import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { SearchBite, toSearchBite } from '../shared/utils/search-bite';

const BITE_COLLECTION = 'bites';
const COUNTRY_CODE_FIELD = 'countryCode';

interface SearchBitesByCountryRequest {
  countryCode?: unknown;
}

/**
 * Returns every bite created in the given country.
 *
 * Unlike the text searches this one is an exact match on the persisted
 * `countryCode`, so the picker on the client and the query here speak the same
 * ISO 3166-1 alpha-2 vocabulary. The result set is deliberately uncapped for
 * now; paging and result limits are being designed as one concept across all
 * search categories.
 */
export const searchBitesByCountry = onAppCheck<SearchBitesByCountryRequest>(
  async (request): Promise<SearchBite[]> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to search for bites by country.',
      );
    }

    if (typeof request.data.countryCode !== 'string') {
      throw new HttpsError('invalid-argument', 'countryCode must be a string.');
    }

    const countryCode = request.data.countryCode.trim().toUpperCase();

    if (!countryCode) {
      return [];
    }

    try {
      const snapshot = await getFirestore()
        .collection(BITE_COLLECTION)
        .where(COUNTRY_CODE_FIELD, '==', countryCode)
        .get();

      return snapshot.docs.map(toSearchBite);
    } catch (error) {
      logger.warn('searchBitesByCountry: failed to load bites for country', {
        countryCode,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  },
);

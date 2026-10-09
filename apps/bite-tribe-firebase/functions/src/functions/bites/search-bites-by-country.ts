import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { SearchBite, toSearchBite } from '../shared/utils/search-bite';
import { requireMember } from '../shared/roles';
import { isBiteVisibleTo } from '../shared/utils/bite-listability';
import { isBlockedUid, loadBlockedUids } from '../shared/utils/user-blocks';

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
 *
 * A Bite whose photo never arrived is returned to its poster only (GitHub issue
 * #1717). The filter runs on the results rather than in the query: an equality
 * on `imageStatus` would need its own index and could never match the
 * creator's own Bites.
 */
export const searchBitesByCountry = onAppCheck<SearchBitesByCountryRequest>(
  async (request): Promise<SearchBite[]> => {
    requireMember(
      request,
      'You must be signed in to search for bites by country.',
    );

    if (typeof request.data.countryCode !== 'string') {
      throw new HttpsError('invalid-argument', 'countryCode must be a string.');
    }

    const countryCode = request.data.countryCode.trim().toUpperCase();

    if (!countryCode) {
      return [];
    }

    try {
      const db = getFirestore();
      const [snapshot, blockedUids] = await Promise.all([
        db
          .collection(BITE_COLLECTION)
          .where(COUNTRY_CODE_FIELD, '==', countryCode)
          .get(),
        loadBlockedUids(db, request.auth.uid),
      ]);

      return snapshot.docs
        .filter(
          (doc) =>
            isBiteVisibleTo(doc.data(), request.auth.uid) &&
            !isBlockedUid(doc.data()['userId'], blockedUids),
        )
        .map(toSearchBite);
    } catch (error) {
      logger.warn('searchBitesByCountry: failed to load bites for country', {
        countryCode,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  },
);

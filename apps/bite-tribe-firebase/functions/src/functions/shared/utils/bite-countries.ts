import {
  DocumentReference,
  FieldValue,
  Firestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { Bite } from '../model/bite';
import {
  extractCountryCodesFromBites,
  normalizeCountryCode,
} from './user-country-codes';

const META_COLLECTION = 'meta';
const BITES_COLLECTION = 'bites';

/**
 * The document in `meta` listing every country in which at least one Bite
 * exists, from any user (GitHub issue #1893). The About page reads it once to
 * light those countries up on its globe.
 */
export const BITE_COUNTRIES_DOCUMENT = 'biteCountries';

/** The field holding the ISO 3166-1 alpha-2 codes, normalised. */
export const BITE_COUNTRIES_FIELD = 'countryCodes';

const biteCountriesRef = (db: Firestore): DocumentReference =>
  db.collection(META_COLLECTION).doc(BITE_COUNTRIES_DOCUMENT);

/**
 * Records that a Bite exists in this country. `arrayUnion` makes a repeat a
 * no-op, so a Bite resolved twice or a trigger delivered twice changes nothing.
 */
export const addBiteCountry = async (
  db: Firestore,
  countryCode: unknown,
): Promise<void> => {
  const normalized = normalizeCountryCode(countryCode);

  if (!normalized) {
    return;
  }

  await biteCountriesRef(db).set(
    {
      [BITE_COUNTRIES_FIELD]: FieldValue.arrayUnion(normalized),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * Drops a country once no Bite is filed under it any more - called after a
 * Bite moved away from it or was deleted. The country stays while any other
 * Bite is still there, the same rule a user's country badges follow.
 *
 * The lookup and the removal are not one transaction: a Bite resolved into the
 * same country in between can be dropped from the list. That window is small,
 * and the operator rebuild repairs it.
 */
export const removeBiteCountryIfUnused = async (
  db: Firestore,
  countryCode: unknown,
): Promise<void> => {
  const normalized = normalizeCountryCode(countryCode);

  if (!normalized) {
    return;
  }

  const remaining = await db
    .collection(BITES_COLLECTION)
    .where('countryCode', '==', normalized)
    .limit(1)
    .get();

  if (!remaining.empty) {
    return;
  }

  await biteCountriesRef(db).set(
    {
      [BITE_COUNTRIES_FIELD]: FieldValue.arrayRemove(normalized),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  logger.info('removeBiteCountryIfUnused: removed country', {
    countryCode: normalized,
  });
};

/**
 * Keeps the list in step with one Bite moving from `previous` to `next`
 * country. Either side may be absent: a new Bite has no previous country, a
 * deleted or unresolved one has no next.
 */
export const updateBiteCountries = async (
  db: Firestore,
  previousCountryCode: unknown,
  countryCode: unknown,
): Promise<void> => {
  const previous = normalizeCountryCode(previousCountryCode);
  const next = normalizeCountryCode(countryCode);

  if (next) {
    await addBiteCountry(db, next);
  }

  if (previous && previous !== next) {
    await removeBiteCountryIfUnused(db, previous);
  }
};

/**
 * Rebuilds the list from every Bite's country, replacing what was there. The
 * first fill of the document, and the repair for any drift; safe to run again.
 */
export const rebuildBiteCountries = async (
  db: Firestore,
): Promise<string[]> => {
  const bitesSnapshot = await db
    .collection(BITES_COLLECTION)
    .select('countryCode')
    .get();

  const countryCodes = extractCountryCodesFromBites(
    bitesSnapshot.docs.map((doc) => doc.data() as Pick<Bite, 'countryCode'>),
  ).sort();

  await biteCountriesRef(db).set({
    [BITE_COUNTRIES_FIELD]: countryCodes,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info('rebuildBiteCountries: complete', {
    bites: bitesSnapshot.size,
    countries: countryCodes.length,
  });

  return countryCodes;
};

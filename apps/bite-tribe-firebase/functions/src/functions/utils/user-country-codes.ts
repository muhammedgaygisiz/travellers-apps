import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { Bite } from '../model/bite';

const USERS_COLLECTION = 'users';
const BITES_COLLECTION = 'bites';
const WRITE_BATCH_LIMIT = 500;

/**
 * The name of the field on a user document that stores the list of ISO 3166-1
 * alpha-2 country codes for the countries the user has created a bite in.
 */
export const COUNTRY_CODES_FIELD = 'countryCodes';

/**
 * Normalizes a country code coming from the geocoding result into the
 * uppercase alpha-2 form we persist, or returns undefined when the value is
 * not a usable country code.
 */
export const normalizeCountryCode = (
  countryCode: unknown,
): string | undefined => {
  if (typeof countryCode !== 'string') {
    return undefined;
  }

  const normalized = countryCode.trim().toUpperCase();

  return normalized ? normalized : undefined;
};

/**
 * Collects the distinct, normalized country codes from a list of bites.
 */
export const extractCountryCodesFromBites = (
  bites: Pick<Bite, 'countryCode'>[],
): string[] => {
  const countryCodes = new Set<string>();

  for (const bite of bites) {
    const countryCode = normalizeCountryCode(bite.countryCode);

    if (countryCode) {
      countryCodes.add(countryCode);
    }
  }

  return [...countryCodes];
};

/**
 * Rebuilds the `countryCodes` list for every user by scanning the country
 * codes of their bites. Used as a one-time migration the first time the
 * feature runs, so existing users immediately get their country badges.
 */
export const backfillUserCountryCodes = async (
  db: admin.firestore.Firestore,
): Promise<void> => {
  logger.info('backfillUserCountryCodes: starting country codes backfill');

  const usersSnapshot = await db.collection(USERS_COLLECTION).get();

  let batch = db.batch();
  let batchSize = 0;
  let updatedUsers = 0;

  for (const userDoc of usersSnapshot.docs) {
    const bitesSnapshot = await db
      .collection(BITES_COLLECTION)
      .where('userId', '==', userDoc.id)
      .get();

    const countryCodes = extractCountryCodesFromBites(
      bitesSnapshot.docs.map((doc) => doc.data() as Bite),
    );

    batch.set(
      userDoc.ref,
      {
        [COUNTRY_CODES_FIELD]: countryCodes,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batchSize++;
    updatedUsers++;

    if (batchSize === WRITE_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  logger.info('backfillUserCountryCodes: country codes backfill complete', {
    totalUsers: usersSnapshot.size,
    updatedUsers,
  });
};

/**
 * Adds the given country code to the user's `countryCodes` list.
 *
 * The first time this runs after the feature is deployed the user document
 * will not have the `countryCodes` property yet. That is our signal that the
 * feature has never run before, so we backfill the list for all users instead
 * of only touching the current one.
 */
export const addCountryCodeToUser = async (
  db: admin.firestore.Firestore,
  userId: string,
  countryCode: unknown,
): Promise<void> => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (!normalizedCountryCode) {
    return;
  }

  const userRef = db.collection(USERS_COLLECTION).doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    logger.warn('addCountryCodeToUser: user not found', { userId });
    return;
  }

  const hasCountryCodesProperty =
    userSnap.get(COUNTRY_CODES_FIELD) !== undefined;

  if (!hasCountryCodesProperty) {
    logger.info(
      'addCountryCodeToUser: country codes property missing, running backfill',
      { userId },
    );
    await backfillUserCountryCodes(db);
    return;
  }

  await userRef.update({
    [COUNTRY_CODES_FIELD]: FieldValue.arrayUnion(normalizedCountryCode),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info('addCountryCodeToUser: added country code', {
    userId,
    countryCode: normalizedCountryCode,
  });
};

import {
  DocumentReference,
  FieldValue,
  UpdateData,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { geohashForLocation } from 'geofire-common';
import { Bite } from '../shared/model/bite';
import {
  BiteAddress,
  Position,
  reverseGeocode,
} from '../shared/utils/reverse-geocode';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  addCountryCodeToUser,
  normalizeCountryCode,
  removeCountryCodeFromUser,
} from '../shared/utils/user-country-codes';
import { notifyOnNewCountryBadge } from '../notifications/notify-on-new-country-badge';

export { extractBiteAddress } from '../shared/utils/reverse-geocode';
export type { BiteAddress } from '../shared/utils/reverse-geocode';

const db = getFirestore();
const BITE_COLLECTION = 'bites';
const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';
const googleGeocodingApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

type AddressStatus = 'pending' | 'resolved' | 'failed';
type EnrichResult = 'resolved' | 'failed' | 'skipped';

/**
 * Every field the reverse geocode derives. A field the new address does not
 * carry is deleted rather than left alone, so a Bite moved from Martin to
 * Budapest cannot keep Martin's region just because Budapest's result had none.
 */
const ADDRESS_FIELDS: (keyof BiteAddress)[] = [
  'city',
  'region',
  'country',
  'countryCode',
  'formatted',
];

interface BackfillBiteAddressRequest {
  biteId?: unknown;
}

interface BackfillBiteAddressResult {
  biteId: string;
  status: EnrichResult;
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const getBitePosition = (
  bite: Pick<Bite, 'position'> | undefined,
): Position | undefined => {
  const position = bite?.position;

  if (
    position &&
    isValidCoordinate(position.latitude) &&
    isValidCoordinate(position.longitude)
  ) {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
    };
  }

  return undefined;
};

const isSamePosition = (a?: Position, b?: Position): boolean =>
  a === b ||
  (!!a && !!b && a.latitude === b.latitude && a.longitude === b.longitude);

const geohashOf = (position: Position): string =>
  geohashForLocation([position.latitude, position.longitude]);

/**
 * Whether a write to a Bite leaves its derived location stale.
 *
 * The address and geohash are derived from `position` alone, so only a new
 * Bite or a moved one needs them derived again - an edit to the name, the
 * rating, or a like counter does not. The geohash check catches a Bite whose
 * position moved before this trigger watched updates (issue: editing the
 * restaurant kept the old city), so such a Bite heals on its next write.
 *
 * This is also what stops the trigger re-triggering itself: its own write
 * leaves `position` alone and stores the geohash that matches it, so the
 * write it causes answers `false` here.
 */
export const needsAddressRederive = (
  before: Bite | undefined,
  after: Bite | undefined,
): boolean => {
  if (!after) {
    return false;
  }

  if (!before) {
    return true;
  }

  const position = getBitePosition(after);

  if (!isSamePosition(getBitePosition(before), position)) {
    return true;
  }

  return !!position && after.geohash !== geohashOf(position);
};

export const buildBiteAddressUpdate = (
  addressStatus: AddressStatus,
  address: BiteAddress = {},
  position?: Position,
): UpdateData<Bite> => {
  const update: UpdateData<Bite> = {
    addressStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const field of ADDRESS_FIELDS) {
    update[field] = address[field] ?? FieldValue.delete();
  }

  if (position) {
    update.geohash = geohashOf(position);
  }

  return update;
};

const loadBiteAddress = (position: Position): Promise<BiteAddress> =>
  reverseGeocode(position, googleGeocodingApiKey.value());

/**
 * Writes the derived location, but only while the Bite still sits where it
 * was geocoded. A second edit that lands during a slow geocode fires its own
 * run, and this one must not overwrite that newer position's address with the
 * older one's.
 */
const writeBiteAddress = (
  biteRef: DocumentReference,
  position: Position | undefined,
  update: UpdateData<Bite>,
): Promise<boolean> =>
  db.runTransaction(async (transaction) => {
    const current = await transaction.get(biteRef);

    if (
      !current.exists ||
      !isSamePosition(getBitePosition(current.data() as Bite), position)
    ) {
      return false;
    }

    transaction.update(biteRef, update);

    return true;
  });

/**
 * Keeps the author's country badges in step with the Bite's country
 * (issue \#1212): the new country is recorded and celebrated when it is a
 * first, and the one the Bite moved away from is dropped once no other Bite
 * of theirs is still there.
 *
 * The badge work is deliberately kept out of the geocoding result: the address
 * is already written at this point, so a failing push send must not travel
 * back up and mark the bite's address as failed.
 */
const updateCountryBadges = async (
  biteId: string,
  userId: string,
  previousCountryCode: unknown,
  countryCode: unknown,
): Promise<void> => {
  try {
    const previous = normalizeCountryCode(previousCountryCode);
    const next = normalizeCountryCode(countryCode);

    if (next) {
      const newCountryCode = await addCountryCodeToUser(db, userId, next);

      if (newCountryCode) {
        await notifyOnNewCountryBadge(userId, newCountryCode);
      }
    }

    if (previous && previous !== next) {
      await removeCountryCodeFromUser(db, userId, previous);
    }
  } catch (error) {
    logger.warn('enrichBiteAddress: failed to update the country badges', {
      biteId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Derives a Bite's address and geohash from its position. The one path the
 * create trigger, the edit trigger and the operator backfill all share.
 *
 * `previousCountryCode` is the country the Bite was filed under before this
 * run, so a Bite that moved country gives its old badge back.
 */
const enrichBiteAddress = async (
  biteId: string,
  bite: Bite,
  biteRef: DocumentReference,
  previousCountryCode?: unknown,
): Promise<EnrichResult> => {
  const position = getBitePosition(bite);

  if (!position) {
    logger.warn('enrichBiteAddress: bite has no valid position', {
      biteId,
    });
    await writeBiteAddress(
      biteRef,
      undefined,
      buildBiteAddressUpdate('failed'),
    );
    return 'failed';
  }

  let address: BiteAddress;

  try {
    address = await loadBiteAddress(position);
  } catch (error) {
    logger.warn('enrichBiteAddress: failed to resolve bite address', {
      biteId,
      error: error instanceof Error ? error.message : String(error),
    });

    const written = await writeBiteAddress(
      biteRef,
      position,
      buildBiteAddressUpdate('failed', {}, position),
    );

    if (written && bite.userId) {
      await updateCountryBadges(
        biteId,
        bite.userId,
        previousCountryCode,
        undefined,
      );
    }

    return written ? 'failed' : 'skipped';
  }

  const written = await writeBiteAddress(
    biteRef,
    position,
    buildBiteAddressUpdate('resolved', address, position),
  );

  if (!written) {
    logger.info('enrichBiteAddress: bite moved while geocoding, skipped', {
      biteId,
    });
    return 'skipped';
  }

  if (bite.userId) {
    await updateCountryBadges(
      biteId,
      bite.userId,
      previousCountryCode,
      address.countryCode,
    );
  }

  logger.info('enrichBiteAddress: resolved bite address', {
    biteId,
    hasCity: Boolean(address.city),
    hasCountry: Boolean(address.country),
  });

  return 'resolved';
};

/**
 * Derives the address on create and again whenever an edit moves the Bite -
 * picking another restaurant moves it - so the city and country shown on the
 * Bite follow its position instead of the one it was first posted at.
 */
export const enrichBiteAddressOnWrite = onDocumentWritten(
  {
    document: 'bites/{biteId}',
    secrets: [googleGeocodingApiKey],
  },
  async (event) => {
    const biteId = event.params.biteId;
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    const before = beforeSnap?.exists ? (beforeSnap.data() as Bite) : undefined;
    const after = afterSnap?.exists ? (afterSnap.data() as Bite) : undefined;

    if (!afterSnap || !after || !needsAddressRederive(before, after)) {
      return;
    }

    await enrichBiteAddress(biteId, after, afterSnap.ref, before?.countryCode);
  },
);

/**
 * Re-runs address enrichment for one Bite.
 *
 * Operator-only: it spends the Google Geocoding key on a Bite the caller does
 * not have to own, and the only surface that offers it is the admin migrations
 * page (issue #1472).
 */
export const backfillBiteAddress = onCall<BackfillBiteAddressRequest>(
  {
    enforceAppCheck: true,
    secrets: [googleGeocodingApiKey],
  },
  async (request): Promise<BackfillBiteAddressResult> => {
    requireAdmin(request);

    if (typeof request.data?.biteId !== 'string' || !request.data.biteId) {
      throw new HttpsError('invalid-argument', 'biteId must be a string.');
    }

    const biteId = request.data.biteId;
    const biteRef = db.collection(BITE_COLLECTION).doc(biteId);
    const biteSnap = await biteRef.get();

    if (!biteSnap.exists) {
      throw new HttpsError('not-found', 'Bite was not found.');
    }

    logOperatorAction(request, {
      action: 'backfillBiteAddress',
      targetType: 'bite',
      targetId: biteId,
      outcome: 'started',
    });

    const bite = biteSnap.data() as Bite;
    let status: EnrichResult;

    if (bite.addressStatus === 'resolved') {
      logger.info('backfillBiteAddress: bite already resolved', { biteId });
      status = 'skipped';
    } else {
      status = await enrichBiteAddress(
        biteSnap.id,
        bite,
        biteSnap.ref,
        bite.countryCode,
      );
    }

    const backfillResult = { biteId, status };

    logOperatorAction(request, {
      action: 'backfillBiteAddress',
      targetType: 'bite',
      targetId: biteId,
      outcome: 'succeeded',
      details: { status },
    });

    return backfillResult;
  },
);

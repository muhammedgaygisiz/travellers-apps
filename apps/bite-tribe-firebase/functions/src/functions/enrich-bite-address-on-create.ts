import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { Bite } from './model/bite';
import { BiteAddress, Position, reverseGeocode } from './utils/reverse-geocode';
import { addCountryCodeToUser } from './utils/user-country-codes';

export { extractBiteAddress } from './utils/reverse-geocode';
export type { BiteAddress } from './utils/reverse-geocode';

const db = admin.firestore();
const BITE_COLLECTION = 'bites';
const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';
const googleGeocodingApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

type AddressStatus = 'pending' | 'resolved' | 'failed';

interface BackfillBiteAddressRequest {
  biteId?: unknown;
}

interface BackfillBiteAddressResult {
  biteId: string;
  status: 'resolved' | 'failed' | 'skipped';
}

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const getBitePosition = (bite: Bite): Position | undefined => {
  const position = bite.position;

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

export const buildBiteAddressUpdate = (
  addressStatus: AddressStatus,
  address: BiteAddress = {},
): admin.firestore.UpdateData<Bite> => ({
  ...address,
  addressStatus,
  updatedAt: FieldValue.serverTimestamp(),
});

const loadBiteAddress = (position: Position): Promise<BiteAddress> =>
  reverseGeocode(position, googleGeocodingApiKey.value());

const enrichBiteAddress = async (
  biteId: string,
  bite: Bite,
  biteRef: admin.firestore.DocumentReference,
): Promise<'resolved' | 'failed' | 'skipped'> => {
  if (bite.addressStatus === 'resolved') {
    logger.info('enrichBiteAddress: bite already resolved', {
      biteId,
    });
    return 'skipped';
  }

  const position = getBitePosition(bite);

  if (!position) {
    logger.warn('enrichBiteAddress: bite has no valid position', {
      biteId,
    });
    await biteRef.update(buildBiteAddressUpdate('failed'));
    return 'failed';
  }

  try {
    const address = await loadBiteAddress(position);

    await biteRef.update(buildBiteAddressUpdate('resolved', address));

    if (bite.userId) {
      await addCountryCodeToUser(db, bite.userId, address.countryCode);
    }

    logger.info('enrichBiteAddress: resolved bite address', {
      biteId,
      hasCity: Boolean(address.city),
      hasCountry: Boolean(address.country),
    });

    return 'resolved';
  } catch (error) {
    logger.warn('enrichBiteAddress: failed to resolve bite address', {
      biteId,
      error: error instanceof Error ? error.message : String(error),
    });

    await biteRef.update(buildBiteAddressUpdate('failed'));
    return 'failed';
  }
};

export const enrichBiteAddressOnCreate = onDocumentCreated(
  {
    document: 'bites/{biteId}',
    secrets: [googleGeocodingApiKey],
  },
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('enrichBiteAddressOnCreate: no bite snapshot found');
      return;
    }

    await enrichBiteAddress(biteId, snap.data() as Bite, snap.ref);
  },
);

export const backfillBiteAddress = onCall<BackfillBiteAddressRequest>(
  {
    enforceAppCheck: true,
    secrets: [googleGeocodingApiKey],
  },
  async (request): Promise<BackfillBiteAddressResult> => {
    if (!request.auth) {
      logger.warn('backfillBiteAddress: unauthenticated request rejected');
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to backfill Bite addresses.',
      );
    }

    if (typeof request.data?.biteId !== 'string' || !request.data.biteId) {
      throw new HttpsError('invalid-argument', 'biteId must be a string.');
    }

    const biteId = request.data.biteId;
    const biteRef = db.collection(BITE_COLLECTION).doc(biteId);
    const biteSnap = await biteRef.get();

    if (!biteSnap.exists) {
      throw new HttpsError('not-found', 'Bite was not found.');
    }

    logger.info('backfillBiteAddress: started', {
      uid: request.auth.uid,
      biteId,
    });

    const status = await enrichBiteAddress(
      biteSnap.id,
      biteSnap.data() as Bite,
      biteSnap.ref,
    );
    const backfillResult = { biteId, status };

    logger.info('backfillBiteAddress: finished', backfillResult);

    return backfillResult;
  },
);

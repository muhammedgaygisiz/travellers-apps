import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { Bite } from './model/bite';

const db = admin.firestore();
const BITE_COLLECTION = 'bites';
const GOOGLE_GEOCODING_API_KEY_ENV = 'GOOGLE_GEOCODING_API_KEY';
const GOOGLE_GEOCODING_BASE_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';
const googleGeocodingApiKey = defineSecret(GOOGLE_GEOCODING_API_KEY_ENV);

type AddressStatus = 'pending' | 'resolved' | 'failed';

interface Position {
  latitude: number;
  longitude: number;
}

interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

interface GoogleGeocodingResult {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
}

interface GoogleGeocodingResponse {
  status?: string;
  error_message?: string;
  results?: GoogleGeocodingResult[];
}

interface BackfillBiteAddressRequest {
  biteId?: unknown;
}

interface BackfillBiteAddressResult {
  biteId: string;
  status: 'resolved' | 'failed' | 'skipped';
}

export interface BiteAddress {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  formatted?: string;
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

const findAddressComponent = (
  components: GoogleAddressComponent[],
  types: string[],
): GoogleAddressComponent | undefined =>
  components.find((component) =>
    types.some((type) => component.types?.includes(type)),
  );

export const extractBiteAddress = (
  result: GoogleGeocodingResult,
): BiteAddress => {
  const components = result.address_components || [];
  const city = findAddressComponent(components, [
    'locality',
    'postal_town',
    'administrative_area_level_2',
  ]);
  const region = findAddressComponent(components, [
    'administrative_area_level_1',
  ]);
  const country = findAddressComponent(components, ['country']);

  return {
    ...(city?.long_name ? { city: city.long_name } : {}),
    ...(region?.long_name ? { region: region.long_name } : {}),
    ...(country?.long_name ? { country: country.long_name } : {}),
    ...(country?.short_name ? { countryCode: country.short_name } : {}),
    ...(result.formatted_address
      ? { formatted: result.formatted_address }
      : {}),
  };
};

export const buildBiteAddressUpdate = (
  addressStatus: AddressStatus,
  address: BiteAddress = {},
): admin.firestore.UpdateData<Bite> => ({
  ...address,
  addressStatus,
  updatedAt: FieldValue.serverTimestamp(),
});

const loadBiteAddress = async (position: Position): Promise<BiteAddress> => {
  const apiKey = googleGeocodingApiKey.value();

  if (!apiKey) {
    throw new Error(`${GOOGLE_GEOCODING_API_KEY_ENV} is not configured.`);
  }

  const url = new URL(GOOGLE_GEOCODING_BASE_URL);
  url.searchParams.set('latlng', `${position.latitude},${position.longitude}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Reverse Geocoding HTTP ${response.status}`);
  }

  const data = (await response.json()) as GoogleGeocodingResponse;

  if (data.status !== 'OK') {
    throw new Error(
      `Google Reverse Geocoding returned ${data.status || 'unknown status'}.`,
    );
  }

  const result = data.results?.[0];

  if (!result) {
    throw new Error('Google Reverse Geocoding returned no results.');
  }

  return extractBiteAddress(result);
};

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

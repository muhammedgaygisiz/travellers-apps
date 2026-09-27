import { geohashForLocation } from 'geofire-common';
import {
  backfillBiteAddress,
  buildBiteAddressUpdate,
  enrichBiteAddressOnWrite,
  extractBiteAddress,
  getBitePosition,
  needsAddressRederive,
} from '../enrich-bite-address-on-write';
import { reverseGeocode } from '../../shared/utils/reverse-geocode';
import {
  addCountryCodeToUser,
  removeCountryCodeFromUser,
} from '../../shared/utils/user-country-codes';
import { notifyOnNewCountryBadge } from '../../notifications/notify-on-new-country-badge';
import { Bite } from '../../shared/model/bite';

/** The Bite document the transaction reads back before it writes. */
let storedBite: Bite | undefined;
const transactionUpdate = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    doc: jest.fn(),
    runTransaction: jest.fn(
      async (
        run: (transaction: unknown) => Promise<unknown>,
      ): Promise<unknown> =>
        run({
          get: jest.fn(async () => ({
            exists: storedBite !== undefined,
            data: () => storedBite,
          })),
          update: transactionUpdate,
        }),
    ),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    delete: jest.fn(() => 'delete-field'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentWritten: jest.fn((_options, handler) => handler),
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
  onCall: jest.fn((_options, handler) => handler),
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({
    name,
    value: jest.fn(() => 'secret-value'),
  })),
}));

jest.mock('../../shared/utils/reverse-geocode', () => ({
  ...jest.requireActual('../../shared/utils/reverse-geocode'),
  reverseGeocode: jest.fn(),
}));

jest.mock('../../shared/utils/user-country-codes', () => ({
  ...jest.requireActual('../../shared/utils/user-country-codes'),
  addCountryCodeToUser: jest.fn(),
  removeCountryCodeFromUser: jest.fn(),
}));

jest.mock('../../notifications/notify-on-new-country-badge', () => ({
  notifyOnNewCountryBadge: jest.fn(),
}));

const MARTIN = { latitude: 49.0665, longitude: 18.9219 };
const BUDAPEST = { latitude: 47.4979, longitude: 19.0402 };

const geohashOf = (position: { latitude: number; longitude: number }): string =>
  geohashForLocation([position.latitude, position.longitude]);

const MARTIN_ADDRESS = {
  city: 'Martin',
  region: 'Žilina Region',
  country: 'Slovakia',
  countryCode: 'SK',
  formatted: 'Martin, Slovakia',
};

const BUDAPEST_ADDRESS = {
  city: 'Budapest',
  country: 'Hungary',
  countryCode: 'HU',
  formatted: 'Budapest, Hungary',
};

/** The Goulash Bite as it stood once its first address resolved in Martin. */
const resolvedInMartin: Bite = {
  id: 'bite-1',
  userId: 'user-1',
  name: 'Goulash with Nokedli',
  place: 'Wrong restaurant',
  price: 12,
  position: MARTIN,
  geohash: geohashOf(MARTIN),
  addressStatus: 'resolved',
  ...MARTIN_ADDRESS,
};

describe('enrich bite address helpers', () => {
  it('reads a valid Bite position', () => {
    expect(
      getBitePosition({
        id: 'bite-1',
        name: 'Pizza',
        place: 'Napoli',
        price: 12,
        userId: 'user-1',
        position: { latitude: 40.8518, longitude: 14.2681 },
      }),
    ).toEqual({ latitude: 40.8518, longitude: 14.2681 });
  });

  it('rejects missing or invalid Bite positions', () => {
    expect(
      getBitePosition({
        id: 'bite-1',
        name: 'Pizza',
        place: 'Napoli',
        price: 12,
        userId: 'user-1',
      }),
    ).toBeUndefined();

    expect(
      getBitePosition({
        id: 'bite-1',
        name: 'Pizza',
        place: 'Napoli',
        price: 12,
        userId: 'user-1',
        position: { latitude: 40.8518, longitude: 'invalid' },
      }),
    ).toBeUndefined();
  });

  it('extracts city, region, country, country code, and formatted address', () => {
    expect(
      extractBiteAddress({
        formatted_address: 'Naples, Metropolitan City of Naples, Italy',
        address_components: [
          {
            long_name: 'Naples',
            short_name: 'Naples',
            types: ['locality', 'political'],
          },
          {
            long_name: 'Campania',
            short_name: 'Campania',
            types: ['administrative_area_level_1', 'political'],
          },
          {
            long_name: 'Italy',
            short_name: 'IT',
            types: ['country', 'political'],
          },
        ],
      }),
    ).toEqual({
      city: 'Naples',
      region: 'Campania',
      country: 'Italy',
      countryCode: 'IT',
      formatted: 'Naples, Metropolitan City of Naples, Italy',
    });
  });

  it('builds status updates that delete the address fields a result lacks', () => {
    expect(
      buildBiteAddressUpdate('resolved', {
        city: 'Naples',
        country: 'Italy',
      }),
    ).toEqual({
      city: 'Naples',
      region: 'delete-field',
      country: 'Italy',
      countryCode: 'delete-field',
      formatted: 'delete-field',
      addressStatus: 'resolved',
      updatedAt: 'server-timestamp',
    });
  });

  it('stores the geohash of the position the address was derived from', () => {
    expect(
      buildBiteAddressUpdate('resolved', BUDAPEST_ADDRESS, BUDAPEST).geohash,
    ).toBe(geohashOf(BUDAPEST));
  });
});

/**
 * The backfill spends the Google Geocoding key on a Bite the caller does not
 * have to own, so it is an operator action rather than a signed-in one
 * (issue #1472).
 */
describe('backfillBiteAddress authorization', () => {
  const handle = (auth: unknown): Promise<unknown> =>
    (backfillBiteAddress as unknown as (request: unknown) => Promise<unknown>)({
      auth,
      data: { biteId: 'bite-1' },
    });

  const codeOf = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise;
    } catch (error) {
      return (error as { code: string }).code;
    }

    throw new Error('Expected the callable to reject, but it resolved.');
  };

  /** A caller the verified ID token says holds `roles`. */
  const callerWith = (roles: unknown): unknown => ({
    uid: 'user-1',
    token: { roles },
  });

  it('rejects an unauthenticated caller', async () => {
    expect(await codeOf(handle(undefined))).toBe('unauthenticated');
  });

  it('rejects a signed-in caller holding no roles', async () => {
    expect(await codeOf(handle(callerWith(undefined)))).toBe(
      'permission-denied',
    );
  });

  it('rejects a caller holding only the business role', async () => {
    expect(await codeOf(handle(callerWith(['business'])))).toBe(
      'permission-denied',
    );
  });
});

describe('needsAddressRederive', () => {
  it('derives a new Bite', () => {
    expect(needsAddressRederive(undefined, resolvedInMartin)).toBe(true);
  });

  it('derives again when an edit moves the Bite', () => {
    expect(
      needsAddressRederive(resolvedInMartin, {
        ...resolvedInMartin,
        position: BUDAPEST,
      }),
    ).toBe(true);
  });

  it('leaves a Bite alone when an edit keeps its position', () => {
    expect(
      needsAddressRederive(resolvedInMartin, {
        ...resolvedInMartin,
        name: 'Goulash',
        rating: 5,
      }),
    ).toBe(false);
  });

  it('ignores its own write, which keeps the position and stores its geohash', () => {
    const pendingInBudapest = {
      ...resolvedInMartin,
      position: BUDAPEST,
      addressStatus: 'pending' as const,
    };

    expect(
      needsAddressRederive(pendingInBudapest, {
        ...pendingInBudapest,
        ...BUDAPEST_ADDRESS,
        geohash: geohashOf(BUDAPEST),
        addressStatus: 'resolved',
      }),
    ).toBe(false);
  });

  it('heals a Bite moved before edits were watched, on its next write', () => {
    const movedEarlier = { ...resolvedInMartin, position: BUDAPEST };

    expect(
      needsAddressRederive(movedEarlier, { ...movedEarlier, thumbup: 1 }),
    ).toBe(true);
  });

  it('ignores a delete', () => {
    expect(needsAddressRederive(resolvedInMartin, undefined)).toBe(false);
  });
});

describe('enrichBiteAddressOnWrite', () => {
  const ref = { id: 'bite-1' };

  const snapshot = (bite: Bite | undefined): unknown => ({
    exists: bite !== undefined,
    data: () => bite,
    ref,
  });

  const write = (before: Bite | undefined, after: Bite | undefined): unknown =>
    (enrichBiteAddressOnWrite as unknown as (event: unknown) => unknown)({
      params: { biteId: 'bite-1' },
      data: { before: snapshot(before), after: snapshot(after) },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    storedBite = undefined;
  });

  it('derives the address of a new Bite and awards its country', async () => {
    const created: Bite = {
      ...resolvedInMartin,
      position: BUDAPEST,
      geohash: geohashOf(BUDAPEST),
      addressStatus: 'pending',
      city: undefined,
      region: undefined,
      country: undefined,
      countryCode: undefined,
      formatted: undefined,
    };
    storedBite = created;
    jest.mocked(reverseGeocode).mockResolvedValue(BUDAPEST_ADDRESS);
    jest.mocked(addCountryCodeToUser).mockResolvedValue('HU');

    await write(undefined, created);

    expect(reverseGeocode).toHaveBeenCalledWith(BUDAPEST, 'secret-value');
    expect(transactionUpdate).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({
        ...BUDAPEST_ADDRESS,
        geohash: geohashOf(BUDAPEST),
        addressStatus: 'resolved',
      }),
    );
    expect(addCountryCodeToUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'HU',
    );
    expect(notifyOnNewCountryBadge).toHaveBeenCalledWith('user-1', 'HU');
    expect(removeCountryCodeFromUser).not.toHaveBeenCalled();
  });

  it('re-derives city, country and geohash when an edit picks a restaurant elsewhere', async () => {
    const edited: Bite = {
      ...resolvedInMartin,
      place: 'Karak Budapest Restaurant',
      position: BUDAPEST,
    };
    storedBite = edited;
    jest.mocked(reverseGeocode).mockResolvedValue(BUDAPEST_ADDRESS);
    jest.mocked(addCountryCodeToUser).mockResolvedValue(undefined);

    await write(resolvedInMartin, edited);

    expect(reverseGeocode).toHaveBeenCalledWith(BUDAPEST, 'secret-value');
    expect(transactionUpdate).toHaveBeenCalledWith(ref, {
      ...BUDAPEST_ADDRESS,
      region: 'delete-field',
      geohash: geohashOf(BUDAPEST),
      addressStatus: 'resolved',
      updatedAt: 'server-timestamp',
    });
    expect(addCountryCodeToUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'HU',
    );
    expect(removeCountryCodeFromUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'SK',
    );
  });

  it('does nothing when an edit keeps the restaurant and position', async () => {
    await write(resolvedInMartin, {
      ...resolvedInMartin,
      name: 'Goulash',
      rating: 4,
    });

    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(transactionUpdate).not.toHaveBeenCalled();
    expect(addCountryCodeToUser).not.toHaveBeenCalled();
    expect(removeCountryCodeFromUser).not.toHaveBeenCalled();
  });

  it('does not overwrite a Bite that moved again while it was geocoded', async () => {
    storedBite = {
      ...resolvedInMartin,
      position: { latitude: 1, longitude: 2 },
    };
    jest.mocked(reverseGeocode).mockResolvedValue(BUDAPEST_ADDRESS);

    await write(resolvedInMartin, { ...resolvedInMartin, position: BUDAPEST });

    expect(transactionUpdate).not.toHaveBeenCalled();
    expect(addCountryCodeToUser).not.toHaveBeenCalled();
  });

  it('clears the stale address when the moved Bite cannot be geocoded', async () => {
    const edited = { ...resolvedInMartin, position: BUDAPEST };
    storedBite = edited;
    jest.mocked(reverseGeocode).mockRejectedValue(new Error('ZERO_RESULTS'));

    await write(resolvedInMartin, edited);

    expect(transactionUpdate).toHaveBeenCalledWith(ref, {
      city: 'delete-field',
      region: 'delete-field',
      country: 'delete-field',
      countryCode: 'delete-field',
      formatted: 'delete-field',
      geohash: geohashOf(BUDAPEST),
      addressStatus: 'failed',
      updatedAt: 'server-timestamp',
    });
    expect(removeCountryCodeFromUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'SK',
    );
  });

  it('ignores a deleted Bite', async () => {
    await write(resolvedInMartin, undefined);

    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(transactionUpdate).not.toHaveBeenCalled();
  });
});

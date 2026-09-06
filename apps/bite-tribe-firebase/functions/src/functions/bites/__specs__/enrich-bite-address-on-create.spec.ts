import {
  backfillBiteAddress,
  buildBiteAddressUpdate,
  extractBiteAddress,
  getBitePosition,
} from '../enrich-bite-address-on-create';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    doc: jest.fn(),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_options, handler) => handler),
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

  it('builds status updates without undefined address fields', () => {
    expect(
      buildBiteAddressUpdate('resolved', {
        city: 'Naples',
        country: 'Italy',
      }),
    ).toEqual({
      city: 'Naples',
      country: 'Italy',
      addressStatus: 'resolved',
      updatedAt: 'server-timestamp',
    });
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

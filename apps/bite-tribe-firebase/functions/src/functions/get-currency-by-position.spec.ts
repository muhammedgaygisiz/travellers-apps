import { getCurrencyByPosition } from './get-currency-by-position';

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
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

// The handler is unwrapped by the mocked onCall above.
const handler = getCurrencyByPosition as unknown as (request: {
  auth?: { uid: string };
  data: { latitude?: unknown; longitude?: unknown };
}) => Promise<{ currency: string | null }>;

const mockGeocodingResponse = (countryShortName: string): any => ({
  ok: true,
  json: async () => ({
    status: 'OK',
    results: [
      {
        formatted_address: 'Somewhere',
        address_components: [
          {
            long_name: 'Country',
            short_name: countryShortName,
            types: ['country', 'political'],
          },
        ],
      },
    ],
  }),
});

describe('getCurrencyByPosition', () => {
  const auth = { uid: 'user-1' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      handler({ data: { latitude: 1, longitude: 2 } }),
    ).rejects.toThrow('You must be signed in to determine the currency.');
  });

  it('rejects invalid coordinates', async () => {
    await expect(
      handler({ auth, data: { latitude: 'nope', longitude: 2 } }),
    ).rejects.toThrow('latitude and longitude must be numbers.');
  });

  it('resolves the currency for the geocoded country', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockGeocodingResponse('KH'),
      ) as unknown as typeof fetch;

    await expect(
      handler({ auth, data: { latitude: 11.55, longitude: 104.91 } }),
    ).resolves.toEqual({ currency: 'KHR' });
  });

  it('returns null when the country has no known currency', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockGeocodingResponse('ZZ'),
      ) as unknown as typeof fetch;

    await expect(
      handler({ auth, data: { latitude: 0, longitude: 0 } }),
    ).resolves.toEqual({ currency: null });
  });

  it('returns null when geocoding fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await expect(
      handler({ auth, data: { latitude: 1, longitude: 2 } }),
    ).resolves.toEqual({ currency: null });
  });
});

import { onAppCheck } from '../../shared/callable-options';
import {
  buildNearbyRequestBody,
  buildRequestBody,
  parsePosition,
  searchNearbyPlaces,
  searchPlaces,
  toGooglePlaces,
  type GooglePlace,
} from '../search-places';

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
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({
    name,
    value: jest.fn(() => 'secret-value'),
  })),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((_options, handler) => handler),
}));

/** The handlers are unwrapped by the mocked onAppCheck above. */
type PlacesHandler<TData> = (request: {
  auth?: { uid: string };
  data: TData;
}) => Promise<GooglePlace[]>;

const searchPlacesHandler = searchPlaces as unknown as PlacesHandler<{
  searchText?: unknown;
  position?: unknown;
}>;

const searchNearbyPlacesHandler =
  searchNearbyPlaces as unknown as PlacesHandler<{
    position?: unknown;
  }>;

const mockPlacesResponse = (): Response =>
  ({
    ok: true,
    json: async () => ({ places: [] }),
  }) as unknown as Response;

/**
 * Places API (New) cannot verify BiteTribe clients itself: App Check tokens
 * only travel with the client Maps and Places SDKs, and these callables reach
 * Google server-to-server with a backend-only key. The callable boundary is
 * therefore the verified control for Places traffic - App Check enforced on
 * registration, plus a signed-in caller. See issue #1245.
 */
describe('places callable boundary', () => {
  const auth = { uid: 'user-1' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers both place searches through the App Check wrapper', () => {
    expect(jest.mocked(onAppCheck).mock.calls).toHaveLength(2);
  });

  it('rejects an unauthenticated text search', async () => {
    await expect(
      searchPlacesHandler({ data: { searchText: 'pizza' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rejects an unauthenticated nearby search', async () => {
    await expect(
      searchNearbyPlacesHandler({
        data: { position: { latitude: 40.85, longitude: 14.26 } },
      }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rejects a nearby search without valid coordinates', async () => {
    await expect(
      searchNearbyPlacesHandler({ auth, data: {} }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('sends the backend-only API key to Google instead of exposing it', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockPlacesResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    await searchPlacesHandler({ auth, data: { searchText: 'pizza' } });

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(init.headers['X-Goog-Api-Key']).toBe('secret-value');
  });

  it('never reaches Google for a search text below the minimum length', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockPlacesResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      searchPlacesHandler({ auth, data: { searchText: 'pi' } }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('search-places helpers', () => {
  describe('parsePosition', () => {
    it('returns a position for valid coordinates', () => {
      expect(parsePosition({ latitude: 40.85, longitude: 14.26 })).toEqual({
        latitude: 40.85,
        longitude: 14.26,
      });
    });

    it('returns undefined for missing or invalid coordinates', () => {
      expect(parsePosition(undefined)).toBeUndefined();
      expect(parsePosition({ latitude: 'a', longitude: 1 })).toBeUndefined();
      expect(parsePosition({ latitude: 1 })).toBeUndefined();
    });
  });

  describe('toGooglePlaces', () => {
    it('maps Google Places results to GooglePlace objects', () => {
      const result = toGooglePlaces({
        places: [
          {
            id: 'place-1',
            displayName: { text: 'Trattoria Roma' },
            formattedAddress: 'Via Roma 1, Napoli',
            location: { latitude: 40.85, longitude: 14.26 },
          },
        ],
      });

      expect(result).toEqual([
        {
          placeId: 'place-1',
          name: 'Trattoria Roma',
          address: 'Via Roma 1, Napoli',
          position: { latitude: 40.85, longitude: 14.26 },
        },
      ]);
    });

    it('drops results without a name or valid position', () => {
      const result = toGooglePlaces({
        places: [
          { id: 'no-name', location: { latitude: 1, longitude: 2 } },
          { id: 'no-position', displayName: { text: 'Nowhere' } },
        ],
      });

      expect(result).toEqual([]);
    });

    it('returns an empty array when there are no places', () => {
      expect(toGooglePlaces({})).toEqual([]);
    });
  });

  describe('buildRequestBody', () => {
    it('includes a location bias when a position is provided', () => {
      const body = buildRequestBody('pizza', {
        latitude: 40.85,
        longitude: 14.26,
      });

      expect(body).toMatchObject({
        textQuery: 'pizza',
        locationBias: {
          circle: {
            center: { latitude: 40.85, longitude: 14.26 },
            radius: 20000,
          },
        },
      });
    });

    it('omits the location bias when no position is provided', () => {
      const body = buildRequestBody('pizza');

      expect(body).toEqual({
        textQuery: 'pizza',
        maxResultCount: 20,
      });
    });
  });

  describe('buildNearbyRequestBody', () => {
    it('builds a distance-ranked restaurant search restricted to the position', () => {
      const body = buildNearbyRequestBody({
        latitude: 40.85,
        longitude: 14.26,
      });

      expect(body).toEqual({
        includedTypes: ['restaurant'],
        maxResultCount: 5,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: 40.85, longitude: 14.26 },
            radius: 20000,
          },
        },
      });
    });
  });

  describe('toGooglePlaces with a limit', () => {
    it('caps the number of returned places', () => {
      const places = Array.from({ length: 8 }, (_, index) => ({
        id: `place-${index}`,
        displayName: { text: `Place ${index}` },
        formattedAddress: `Address ${index}`,
        location: { latitude: index, longitude: index },
      }));

      const result = toGooglePlaces({ places }, 5);

      expect(result).toHaveLength(5);
      expect(result[0].placeId).toBe('place-0');
    });
  });
});

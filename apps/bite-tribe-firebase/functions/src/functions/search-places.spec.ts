import {
  buildRequestBody,
  parsePosition,
  toGooglePlaces,
} from './search-places';

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

jest.mock('./callable-options', () => ({
  onAppCheck: jest.fn((_options, handler) => handler),
}));

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
});

import {
  extractCountryCodesFromBites,
  normalizeCountryCode,
} from './user-country-codes';

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    arrayUnion: jest.fn((value: string) => ({ arrayUnion: value })),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('user country codes helpers', () => {
  describe('normalizeCountryCode', () => {
    it('uppercases and trims a country code', () => {
      expect(normalizeCountryCode(' it ')).toBe('IT');
    });

    it('returns undefined for non-string or empty values', () => {
      expect(normalizeCountryCode(undefined)).toBeUndefined();
      expect(normalizeCountryCode(42)).toBeUndefined();
      expect(normalizeCountryCode('   ')).toBeUndefined();
    });
  });

  describe('extractCountryCodesFromBites', () => {
    it('collects distinct, normalized country codes', () => {
      expect(
        extractCountryCodesFromBites([
          { countryCode: 'IT' },
          { countryCode: 'it' },
          { countryCode: ' de ' },
          { countryCode: undefined },
          { countryCode: 'CH' },
        ]),
      ).toEqual(['IT', 'DE', 'CH']);
    });

    it('returns an empty array when no bite has a country code', () => {
      expect(
        extractCountryCodesFromBites([{ countryCode: undefined }, {}]),
      ).toEqual([]);
    });
  });
});

import {
  extractCountryCodesFromBites,
  normalizeCountryCode,
  removeCountryCodeFromUser,
} from '../user-country-codes';

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    arrayUnion: jest.fn((value: string) => ({ arrayUnion: value })),
    arrayRemove: jest.fn((value: string) => ({ arrayRemove: value })),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

interface FakeUserDoc {
  exists?: boolean;
  countryCodes?: unknown;
}

const createDbMock = (options: {
  user: FakeUserDoc;
  remainingBiteCountryCodes: (string | undefined)[];
}): any => {
  const update = jest.fn();

  const userRef = {
    get: jest.fn(async () => ({
      exists: options.user.exists ?? true,
      get: (field: string): unknown =>
        field === 'countryCodes' ? options.user.countryCodes : undefined,
    })),
    update,
  };

  const bitesQuery = {
    select: jest.fn(() => bitesQuery),
    get: jest.fn(async () => ({
      docs: options.remainingBiteCountryCodes.map((countryCode) => ({
        data: (): { countryCode: string } => ({ countryCode }),
      })),
    })),
  };

  const db = {
    collection: jest.fn((name: string) => {
      if (name === 'users') {
        return { doc: jest.fn(() => userRef) };
      }

      return { where: jest.fn(() => bitesQuery) };
    }),
  };

  return { db, update };
};

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

  describe('removeCountryCodeFromUser', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runRemove = (db: any): Promise<void> =>
      removeCountryCodeFromUser(db, 'user-1', 'IT');

    it('removes the code when the user has no remaining bites in that country', async () => {
      const { db, update } = createDbMock({
        user: { countryCodes: ['IT', 'CH'] },
        remainingBiteCountryCodes: ['CH'],
      });

      await runRemove(db);

      expect(update).toHaveBeenCalledWith({
        countryCodes: { arrayRemove: 'IT' },
        updatedAt: 'server-timestamp',
      });
    });

    it('keeps the code when another bite in that country still exists', async () => {
      const { db, update } = createDbMock({
        user: { countryCodes: ['IT', 'CH'] },
        remainingBiteCountryCodes: ['IT', 'CH'],
      });

      await runRemove(db);

      expect(update).not.toHaveBeenCalled();
    });

    it('does nothing when the user has no countryCodes property yet', async () => {
      const { db, update } = createDbMock({
        user: { countryCodes: undefined },
        remainingBiteCountryCodes: [],
      });

      await runRemove(db);

      expect(update).not.toHaveBeenCalled();
    });

    it('ignores bites without a resolved country code', async () => {
      const { db, update } = createDbMock({
        user: { countryCodes: ['IT'] },
        remainingBiteCountryCodes: [undefined],
      });

      await runRemove(db);

      expect(update).toHaveBeenCalledWith({
        countryCodes: { arrayRemove: 'IT' },
        updatedAt: 'server-timestamp',
      });
    });
  });
});

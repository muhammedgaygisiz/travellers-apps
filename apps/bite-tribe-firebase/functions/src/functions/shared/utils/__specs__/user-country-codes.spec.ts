import {
  addCountryCodeToUser,
  extractCountryCodesFromBites,
  normalizeCountryCode,
  removeCountryCodeFromUser,
} from '../user-country-codes';

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

  const batchSet = jest.fn();
  const batchCommit = jest.fn();

  const db = {
    collection: jest.fn((name: string) => {
      if (name === 'users') {
        return {
          doc: jest.fn(() => userRef),
          // Only the backfill scans the whole collection; an empty result keeps
          // that path harmless for the tests that fall into it.
          get: jest.fn(async () => ({ size: 0, docs: [] })),
        };
      }

      return { where: jest.fn(() => bitesQuery) };
    }),
    batch: jest.fn(() => ({ set: batchSet, commit: batchCommit })),
  };

  return { db, update, batchCommit };
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

  describe('addCountryCodeToUser', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runAdd = (db: any): Promise<unknown> =>
      addCountryCodeToUser(db, 'user-1', 'IT');

    it('reports the country as new when the profile did not cover it yet', async () => {
      const { db, update } = createDbMock({
        user: { countryCodes: ['CH'] },
        remainingBiteCountryCodes: [],
      });

      await expect(runAdd(db)).resolves.toBe('IT');

      expect(update).toHaveBeenCalledWith({
        countryCodes: { arrayUnion: 'IT' },
        updatedAt: 'server-timestamp',
      });
    });

    it('reports nothing when the badge was already earned', async () => {
      // A second Bite in a country the user has been to is not an achievement,
      // so it must not congratulate them again (issue #1212).
      const { db } = createDbMock({
        user: { countryCodes: ['CH', 'IT'] },
        remainingBiteCountryCodes: [],
      });

      await expect(runAdd(db)).resolves.toBeUndefined();
    });

    it('matches an already earned badge regardless of how it was stored', async () => {
      const { db } = createDbMock({
        user: { countryCodes: [' it '] },
        remainingBiteCountryCodes: [],
      });

      await expect(runAdd(db)).resolves.toBeUndefined();
    });

    it('reports the first country of an empty profile as new', async () => {
      const { db } = createDbMock({
        user: { countryCodes: [] },
        remainingBiteCountryCodes: [],
      });

      await expect(runAdd(db)).resolves.toBe('IT');
    });

    it('stays silent while backfilling a profile that predates the feature', async () => {
      // The backfill reconstructs a history the user already lived through, so
      // it is a migration and not a badge to celebrate.
      const { db, update, batchCommit } = createDbMock({
        user: { countryCodes: undefined },
        remainingBiteCountryCodes: [],
      });

      await expect(runAdd(db)).resolves.toBeUndefined();

      expect(update).not.toHaveBeenCalled();
      expect(batchCommit).not.toHaveBeenCalled();
    });

    it('reports nothing for a bite without a usable country code', async () => {
      const { db, update } = createDbMock({
        user: { countryCodes: ['CH'] },
        remainingBiteCountryCodes: [],
      });

      await expect(
        addCountryCodeToUser(db, 'user-1', undefined),
      ).resolves.toBeUndefined();

      expect(update).not.toHaveBeenCalled();
    });

    it('reports nothing when the user does not exist', async () => {
      const { db, update } = createDbMock({
        user: { exists: false },
        remainingBiteCountryCodes: [],
      });

      await expect(runAdd(db)).resolves.toBeUndefined();

      expect(update).not.toHaveBeenCalled();
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

import {
  addBiteCountry,
  rebuildBiteCountries,
  removeBiteCountryIfUnused,
  updateBiteCountries,
} from '../bite-countries';

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    arrayUnion: jest.fn((value: string) => ({ arrayUnion: value })),
    arrayRemove: jest.fn((value: string) => ({ arrayRemove: value })),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

/**
 * A Firestore stand-in with one `meta/biteCountries` document and a `bites`
 * collection whose country codes the test chooses.
 */
interface DbMock {
  db: never;
  set: jest.Mock;
  where: jest.Mock;
  metaDoc: jest.Mock;
}

const createDbMock = (biteCountryCodes: (string | undefined)[]): DbMock => {
  const set = jest.fn();
  const where = jest.fn((_field: string, _op: string, value: string) => ({
    limit: jest.fn(() => ({
      get: jest.fn(async () => ({
        empty: !biteCountryCodes.includes(value),
      })),
    })),
  }));
  const select = jest.fn(() => ({
    get: jest.fn(async () => ({
      size: biteCountryCodes.length,
      docs: biteCountryCodes.map((countryCode) => ({
        data: (): { countryCode: string | undefined } => ({ countryCode }),
      })),
    })),
  }));
  const metaDoc = jest.fn(() => ({ set }));

  const db = {
    collection: jest.fn((name: string) =>
      name === 'meta' ? { doc: metaDoc } : { where, select },
    ),
  };

  return { db: db as never, set, where, metaDoc };
};

describe('bite countries', () => {
  it('adds a normalised country to meta/biteCountries', async () => {
    const { db, set, metaDoc } = createDbMock([]);

    await addBiteCountry(db, ' hu ');

    expect(metaDoc).toHaveBeenCalledWith('biteCountries');
    expect(set).toHaveBeenCalledWith(
      { countryCodes: { arrayUnion: 'HU' }, updatedAt: 'server-timestamp' },
      { merge: true },
    );
  });

  it('ignores a missing country', async () => {
    const { db, set } = createDbMock([]);

    await addBiteCountry(db, undefined);
    await removeBiteCountryIfUnused(db, '');

    expect(set).not.toHaveBeenCalled();
  });

  it('keeps a country while another Bite is still filed under it', async () => {
    const { db, set, where } = createDbMock(['SK']);

    await removeBiteCountryIfUnused(db, 'sk');

    expect(where).toHaveBeenCalledWith('countryCode', '==', 'SK');
    expect(set).not.toHaveBeenCalled();
  });

  it('removes a country once no Bite is filed under it', async () => {
    const { db, set } = createDbMock(['HU']);

    await removeBiteCountryIfUnused(db, 'SK');

    expect(set).toHaveBeenCalledWith(
      { countryCodes: { arrayRemove: 'SK' }, updatedAt: 'server-timestamp' },
      { merge: true },
    );
  });

  it('adds the new country and checks the old one when a Bite moves', async () => {
    const { db, set } = createDbMock(['HU']);

    await updateBiteCountries(db, 'SK', 'HU');

    expect(set).toHaveBeenCalledWith(
      { countryCodes: { arrayUnion: 'HU' }, updatedAt: 'server-timestamp' },
      { merge: true },
    );
    expect(set).toHaveBeenCalledWith(
      { countryCodes: { arrayRemove: 'SK' }, updatedAt: 'server-timestamp' },
      { merge: true },
    );
  });

  it('removes nothing when the country did not change', async () => {
    const { db, where } = createDbMock([]);

    await updateBiteCountries(db, 'hu', 'HU');

    expect(where).not.toHaveBeenCalled();
  });

  it('rebuilds the list from every Bite, distinct, normalised and sorted', async () => {
    const { db, set } = createDbMock(['tr', 'DE', undefined, 'TR', ' de']);

    const result = await rebuildBiteCountries(db);

    expect(result).toEqual(['DE', 'TR']);
    expect(set).toHaveBeenCalledWith({
      countryCodes: ['DE', 'TR'],
      updatedAt: 'server-timestamp',
    });
  });
});

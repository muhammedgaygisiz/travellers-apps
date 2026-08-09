import { getFirestore } from 'firebase-admin/firestore';
import { searchBitesByCountry } from '../search-bites-by-country';
import type { SearchBite } from '../../shared/utils/search-bite';

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

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (optionsOrHandler: unknown, maybeHandler?: unknown) =>
      maybeHandler ?? optionsOrHandler,
  ),
}));

/** The handler is unwrapped by the mocked onAppCheck above. */
type SearchBitesByCountryHandler = (request: {
  auth?: { uid: string };
  data: { countryCode?: unknown };
}) => Promise<SearchBite[]>;

const handler = searchBitesByCountry as unknown as SearchBitesByCountryHandler;

const getFirestoreMock = getFirestore as jest.Mock;

/** The slice of a Firestore document snapshot that `toSearchBite` reads. */
interface BiteDocData {
  id: string;
  name: string;
  place: string;
}

interface BiteDocStub {
  id: string;
  data: () => BiteDocData;
}

interface FirestoreStub {
  collection: jest.Mock;
  where: jest.Mock;
  get: jest.Mock;
}

const biteDoc = (id: string, name: string): BiteDocStub => ({
  id,
  data: (): BiteDocData => ({ id, name, place: `${name} place` }),
});

const mockFirestore = (docs: BiteDocStub[]): FirestoreStub => {
  const get = jest.fn().mockResolvedValue({ docs });
  const where = jest.fn().mockReturnValue({ get });
  const collection = jest.fn().mockReturnValue({ where });

  getFirestoreMock.mockReturnValue({ collection });

  return { collection, where, get };
};

describe('searchBitesByCountry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an unauthenticated caller', async () => {
    await expect(handler({ data: { countryCode: 'CH' } })).rejects.toThrow(
      'You must be signed in to search for bites by country.',
    );
  });

  it('rejects a country code that is not a string', async () => {
    await expect(
      handler({ auth: { uid: 'user-1' }, data: { countryCode: 42 } }),
    ).rejects.toThrow('countryCode must be a string.');
  });

  it('returns nothing for a blank country code without querying', async () => {
    const { collection } = mockFirestore([]);

    await expect(
      handler({ auth: { uid: 'user-1' }, data: { countryCode: '  ' } }),
    ).resolves.toEqual([]);
    expect(collection).not.toHaveBeenCalled();
  });

  it('matches the persisted country code in its uppercase form', async () => {
    const { collection, where } = mockFirestore([biteDoc('bite-1', 'Fondue')]);

    await handler({ auth: { uid: 'user-1' }, data: { countryCode: ' ch ' } });

    expect(collection).toHaveBeenCalledWith('bites');
    expect(where).toHaveBeenCalledWith('countryCode', '==', 'CH');
  });

  it('returns every bite in the country, with no result cap', async () => {
    const docs = Array.from({ length: 25 }, (_, index) =>
      biteDoc(`bite-${index}`, `Bite ${index}`),
    );
    mockFirestore(docs);

    const result = await handler({
      auth: { uid: 'user-1' },
      data: { countryCode: 'CH' },
    });

    expect(result).toHaveLength(25);
    expect(result[0]).toEqual({
      id: 'bite-0',
      name: 'Bite 0',
      place: 'Bite 0 place',
    });
  });

  it('returns an empty list when the query fails', async () => {
    const get = jest.fn().mockRejectedValue(new Error('firestore is down'));
    getFirestoreMock.mockReturnValue({
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ get }),
      }),
    });

    await expect(
      handler({ auth: { uid: 'user-1' }, data: { countryCode: 'CH' } }),
    ).resolves.toEqual([]);
  });
});

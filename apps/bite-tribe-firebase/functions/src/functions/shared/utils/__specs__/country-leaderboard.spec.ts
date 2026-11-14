import type { Firestore } from 'firebase-admin/firestore';
import {
  ALL_TIME_CACHE_MS,
  collectAllTimeCountries,
  freezeCountriesLastWeek,
  LEADERBOARD_COUNTRIES_LAST_WEEK_DOC,
  readWeekCountries,
  tallyCountries,
  WEEK_CACHE_MS,
} from '../country-leaderboard';

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'server-timestamp') },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

type Data = Record<string, unknown>;

const NOW = Date.parse('2026-11-14T15:30:00Z');
const THIS_WEEK = Date.parse('2026-11-10T12:00:00Z');
const LAST_WEEK = Date.parse('2026-11-03T12:00:00Z');

describe('tallyCountries', () => {
  it('ranks countries by their listable Bites', () => {
    expect(
      tallyCountries([
        { countryCode: 'ba' },
        { countryCode: 'CH' },
        { countryCode: 'BA ' },
        { countryCode: 'CH', imageStatus: 'pending' },
        { countryCode: 'CH', imageStatus: 'failed' },
        { countryCode: 'CH', imageStatus: 'uploaded' },
        {},
      ]),
    ).toEqual([
      { countryCode: 'BA', biteCount: 2 },
      { countryCode: 'CH', biteCount: 2 },
    ]);
  });

  it('keeps the top 10', () => {
    const bites = Array.from({ length: 12 }, (_, i) => ({
      countryCode: `C${String.fromCharCode(65 + i)}`,
    }));

    expect(tallyCountries(bites)).toHaveLength(10);
  });
});

/** Bites by creation time, `/meta` documents, and `count()` per country. */
const fakeDb = (
  bites: (Data & { createdAtTimestamp: number })[],
  meta: Record<string, Data> = {},
): { db: Firestore; meta: Map<string, Data>; reads: string[] } => {
  const metaDocs = new Map(Object.entries(meta));
  const reads: string[] = [];

  interface Query {
    where: (field: string, op: string, value: unknown) => Query;
    get: () => Promise<{ docs: { data: () => Data }[] }>;
    count: () => { get: () => Promise<{ data: () => { count: number } }> };
  }

  const query = (filters: [string, string, unknown][]): Query => {
    const matches = (): Data[] =>
      bites.filter((bite) =>
        filters.every(([field, op, value]) => {
          const actual = bite[field];

          switch (op) {
            case '>=':
              return (actual as number) >= (value as number);
            case '<':
              return (actual as number) < (value as number);
            case 'in':
              return (value as unknown[]).includes(actual);
            default:
              return actual === value;
          }
        }),
      );

    return {
      where: (field, op, value): Query =>
        query([...filters, [field, op, value]]),
      get: async (): Promise<{ docs: { data: () => Data }[] }> => {
        reads.push('bites');

        return { docs: matches().map((bite) => ({ data: (): Data => bite })) };
      },
      count: () => ({
        get: async (): Promise<{ data: () => { count: number } }> => ({
          data: (): { count: number } => ({ count: matches().length }),
        }),
      }),
    };
  };

  const db = {
    collection: (name: string): unknown =>
      name === 'meta'
        ? {
            doc: (id: string): unknown => ({
              get: async (): Promise<{ data: () => Data | undefined }> => ({
                data: (): Data | undefined => metaDocs.get(id),
              }),
              set: async (data: Data): Promise<void> => {
                metaDocs.set(id, data);
              },
            }),
          }
        : query([]),
  } as unknown as Firestore;

  return { db, meta: metaDocs, reads };
};

describe('readWeekCountries', () => {
  it('ranks the week’s Bites and serves the result from cache for a while', async () => {
    const { db, reads } = fakeDb([
      { countryCode: 'BA', createdAtTimestamp: THIS_WEEK },
      { countryCode: 'CH', createdAtTimestamp: LAST_WEEK },
    ]);

    const board = await readWeekCountries(db, NOW);

    expect(board.week).toBe('2026-11-09');
    expect(board.countries).toEqual([{ countryCode: 'BA', biteCount: 1 }]);

    await readWeekCountries(db, NOW + WEEK_CACHE_MS - 1);
    expect(reads).toHaveLength(1);

    await readWeekCountries(db, NOW + WEEK_CACHE_MS);
    expect(reads).toHaveLength(2);
  });
});

describe('freezeCountriesLastWeek', () => {
  it('freezes last week once and never computes it again', async () => {
    const { db, meta, reads } = fakeDb([
      { countryCode: 'CH', createdAtTimestamp: LAST_WEEK },
    ]);

    const board = await freezeCountriesLastWeek(db, NOW);
    await freezeCountriesLastWeek(db, NOW + ALL_TIME_CACHE_MS * 24);

    expect(board.week).toBe('2026-11-02');
    expect(board.countries).toEqual([{ countryCode: 'CH', biteCount: 1 }]);
    expect(meta.get(LEADERBOARD_COUNTRIES_LAST_WEEK_DOC)?.['week']).toBe(
      '2026-11-02',
    );
    expect(reads).toHaveLength(1);
  });
});

describe('collectAllTimeCountries', () => {
  it('counts every listable Bite of every listed country', async () => {
    const { db } = fakeDb(
      [
        { countryCode: 'CH', createdAtTimestamp: 1 },
        { countryCode: 'CH', createdAtTimestamp: 2 },
        { countryCode: 'CH', imageStatus: 'pending', createdAtTimestamp: 3 },
        { countryCode: 'BA', createdAtTimestamp: 4 },
        { countryCode: 'TR', imageStatus: 'failed', createdAtTimestamp: 5 },
      ],
      { biteCountries: { countryCodes: ['CH', 'ba', 'TR'] } },
    );

    expect(await collectAllTimeCountries(db)).toEqual([
      { countryCode: 'CH', biteCount: 2 },
      { countryCode: 'BA', biteCount: 1 },
    ]);
  });
});

import type { Firestore } from 'firebase-admin/firestore';
import {
  collectWeeklyRanking,
  freezeLastWeek,
  LEADERBOARD_LAST_WEEK_DOC,
  previousWeekOf,
  readWeeklyLeaderboard,
  tallyWeeklyBites,
  weekKey,
  weekOf,
} from '../weekly-leaderboard';

jest.mock('firebase-admin/firestore', () => ({
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

const at = (iso: string): number => Date.parse(iso);

describe('weekOf', () => {
  it('starts the week on Monday 00:00 UTC', () => {
    // Saturday 14 November 2026, afternoon.
    const week = weekOf(at('2026-11-14T15:30:00Z'));

    expect(new Date(week.start).toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(new Date(week.end).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });

  it('puts Sunday 23:59 UTC in the week that is ending', () => {
    expect(weekKey(weekOf(at('2026-11-15T23:59:59Z')))).toBe('2026-11-09');
  });

  it('puts Monday 00:00 UTC in the new week', () => {
    expect(weekKey(weekOf(at('2026-11-16T00:00:00Z')))).toBe('2026-11-16');
  });

  it('crosses a year boundary', () => {
    expect(weekKey(weekOf(at('2027-01-01T12:00:00Z')))).toBe('2026-12-28');
  });
});

describe('previousWeekOf', () => {
  it('is the week that ended at the last reset', () => {
    const week = previousWeekOf(at('2026-11-16T08:00:00Z'));

    expect(weekKey(week)).toBe('2026-11-09');
    expect(week.end).toBe(at('2026-11-16T00:00:00Z'));
  });
});

describe('tallyWeeklyBites', () => {
  it('counts each author and orders by count', () => {
    const tallies = tallyWeeklyBites([
      { userId: 'ana', createdAtTimestamp: 1 },
      { userId: 'ben', createdAtTimestamp: 2 },
      { userId: 'ben', createdAtTimestamp: 3 },
    ]);

    expect(tallies.map((t) => [t.userId, t.count])).toEqual([
      ['ben', 2],
      ['ana', 1],
    ]);
  });

  it('breaks a tie in favour of whoever reached the count first', () => {
    const tallies = tallyWeeklyBites([
      { userId: 'late', createdAtTimestamp: 1 },
      { userId: 'early', createdAtTimestamp: 2 },
      { userId: 'early', createdAtTimestamp: 3 },
      { userId: 'late', createdAtTimestamp: 9 },
    ]);

    expect(tallies.map((t) => t.userId)).toEqual(['early', 'late']);
  });

  it('skips a Bite without an author', () => {
    expect(tallyWeeklyBites([{ userId: '', createdAtTimestamp: 1 }])).toEqual(
      [],
    );
  });
});

interface FakeDb {
  db: Firestore;
  meta: Map<string, Record<string, unknown>>;
  biteQueries: { from: number; to: number }[];
}

/**
 * A Firestore stand-in holding Bites, users and `/meta` documents - just the
 * calls the weekly board makes.
 */
const fakeDb = (
  bites: { userId: string; createdAtTimestamp: number }[],
  users: Record<string, Record<string, unknown>>,
  meta: Record<string, Record<string, unknown>> = {},
): FakeDb => {
  const metaDocs = new Map(Object.entries(meta));
  const biteQueries: { from: number; to: number }[] = [];

  type Data = Record<string, unknown> | undefined;
  interface FakeSnapshot {
    data: () => Data;
  }
  interface FakeDoc {
    collection: string;
    id: string;
    get: () => Promise<FakeSnapshot>;
    set: (data: Record<string, unknown>) => Promise<void>;
  }
  interface FakeQuery {
    get: () => Promise<{ docs: FakeSnapshot[] }>;
  }

  const doc = (collection: string, id: string): FakeDoc => ({
    collection,
    id,
    get: async (): Promise<FakeSnapshot> => ({
      data: (): Data => (collection === 'meta' ? metaDocs.get(id) : users[id]),
    }),
    set: async (data: Record<string, unknown>): Promise<void> => {
      metaDocs.set(id, data);
    },
  });

  const range = (from: number, to: number): FakeQuery => ({
    get: async (): Promise<{ docs: FakeSnapshot[] }> => {
      biteQueries.push({ from, to });

      return {
        docs: bites
          .filter(
            (bite) =>
              bite.createdAtTimestamp >= from && bite.createdAtTimestamp < to,
          )
          .map((bite) => ({ data: (): Data => bite })),
      };
    },
  });

  const db = {
    collection: (
      name: string,
    ): {
      doc: (id: string) => FakeDoc;
      where: (
        field: string,
        op: string,
        from: number,
      ) => { where: (field: string, op: string, to: number) => FakeQuery };
    } => ({
      doc: (id: string): FakeDoc => doc(name, id),
      where: (
        _field: string,
        _op: string,
        from: number,
      ): { where: (field: string, op: string, to: number) => FakeQuery } => ({
        where: (_f: string, _o: string, to: number): FakeQuery =>
          range(from, to),
      }),
    }),
    getAll: async (
      ...refs: { id: string }[]
    ): Promise<{ id: string; exists: boolean; data: () => Data }[]> =>
      refs.map((ref) => ({
        id: ref.id,
        exists: ref.id in users,
        data: (): Data => users[ref.id],
      })),
  } as unknown as Firestore;

  return { db, meta: metaDocs, biteQueries };
};

const NOW = at('2026-11-14T15:30:00Z');
const THIS_WEEK = at('2026-11-10T12:00:00Z');
const LAST_WEEK = at('2026-11-03T12:00:00Z');

const publicUser = (name: string): Record<string, unknown> => ({
  userId: name,
  displayName: name,
  photoUrl: '',
  public: true,
  biteCount: 500,
});

describe('collectWeeklyRanking', () => {
  it('ranks by this week’s Bites and reports that count, not the all-time one', async () => {
    const { db } = fakeDb(
      [
        { userId: 'veteran', createdAtTimestamp: THIS_WEEK },
        { userId: 'newcomer', createdAtTimestamp: THIS_WEEK },
        { userId: 'newcomer', createdAtTimestamp: THIS_WEEK + 1 },
      ],
      { veteran: publicUser('veteran'), newcomer: publicUser('newcomer') },
    );

    const ranking = await collectWeeklyRanking(db, weekOf(NOW));

    expect(ranking.map((u) => [u.userId, u.biteCount])).toEqual([
      ['newcomer', 2],
      ['veteran', 1],
    ]);
  });

  it('leaves out private and deleted accounts', async () => {
    const { db } = fakeDb(
      [
        { userId: 'private', createdAtTimestamp: THIS_WEEK },
        { userId: 'deleted', createdAtTimestamp: THIS_WEEK },
        { userId: 'shown', createdAtTimestamp: THIS_WEEK },
      ],
      {
        private: { ...publicUser('private'), public: false },
        shown: publicUser('shown'),
      },
    );

    const ranking = await collectWeeklyRanking(db, weekOf(NOW));

    expect(ranking.map((u) => u.userId)).toEqual(['shown']);
  });

  it('keeps at most ten users', async () => {
    const names = Array.from({ length: 14 }, (_, i) => `user-${i}`);
    const { db } = fakeDb(
      names.map((userId) => ({ userId, createdAtTimestamp: THIS_WEEK })),
      Object.fromEntries(names.map((name) => [name, publicUser(name)])),
    );

    expect(await collectWeeklyRanking(db, weekOf(NOW))).toHaveLength(10);
  });
});

describe('readWeeklyLeaderboard', () => {
  it('reads empty right after the reset, whatever last week held', async () => {
    const { db } = fakeDb(
      [{ userId: 'ana', createdAtTimestamp: LAST_WEEK }],
      { ana: publicUser('ana') },
      {
        leaderboardWeekly: {
          week: '2026-11-02',
          users: [publicUser('ana')],
        },
      },
    );

    const board = await readWeeklyLeaderboard(db, at('2026-11-09T00:00:01Z'));

    expect(board.week).toBe('2026-11-09');
    expect(board.users).toEqual([]);
  });

  it('serves the stored board while it is this week’s', async () => {
    const stored = {
      week: '2026-11-09',
      start: 1,
      end: 2,
      users: [publicUser('ana')],
    };
    const { db, biteQueries } = fakeDb([], {}, { leaderboardWeekly: stored });

    const board = await readWeeklyLeaderboard(db, NOW);

    expect(board.users).toEqual(stored.users);
    expect(biteQueries).toEqual([]);
  });
});

describe('freezeLastWeek', () => {
  it('stores the previous week’s final standings', async () => {
    const { db, meta } = fakeDb(
      [
        { userId: 'ana', createdAtTimestamp: LAST_WEEK },
        { userId: 'ben', createdAtTimestamp: THIS_WEEK },
      ],
      { ana: publicUser('ana'), ben: publicUser('ben') },
    );

    const board = await freezeLastWeek(db, NOW);

    expect(board.week).toBe('2026-11-02');
    expect(board.users.map((u) => u.userId)).toEqual(['ana']);
    expect(meta.get(LEADERBOARD_LAST_WEEK_DOC)?.['week']).toBe('2026-11-02');
  });

  it('never rewrites a week that is already frozen', async () => {
    const frozen = {
      week: '2026-11-02',
      start: 1,
      end: 2,
      users: [publicUser('ana')],
    };
    const { db, biteQueries } = fakeDb(
      [{ userId: 'ben', createdAtTimestamp: LAST_WEEK }],
      { ben: publicUser('ben') },
      { [LEADERBOARD_LAST_WEEK_DOC]: frozen },
    );

    const board = await freezeLastWeek(db, NOW);

    expect(board.users.map((u) => u.userId)).toEqual(['ana']);
    expect(biteQueries).toEqual([]);
  });
});

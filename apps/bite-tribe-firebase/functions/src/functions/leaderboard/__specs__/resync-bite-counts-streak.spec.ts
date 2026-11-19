/**
 * The weekly resync recomputes the posting streak alongside the Bite count
 * (issue #2146). The Firestore here holds two users: one whose stored streak
 * is stale and whose count is right, and one where both are already right.
 */
const NOW = Date.parse('2026-11-23T02:00:00Z'); // Monday 03:00 Zurich

const STALE_UID = 'stale';
const SETTLED_UID = 'settled';

const bitesByUser: Record<string, number[]> = {
  // Last Bite in the week of 9 November: the week of 16 November passed
  // without one, so the streak is broken.
  [STALE_UID]: [Date.parse('2026-11-10T09:00:00Z')],
  // A Bite in the week that just ended keeps the streak.
  [SETTLED_UID]: [Date.parse('2026-11-20T09:00:00Z')],
};

const updates: { path: string; data: Record<string, unknown> }[] = [];
const commit = jest.fn(async () => undefined);

type UserDoc = {
  id: string;
  ref: { path: string };
  data: () => Record<string, unknown>;
};

const userDoc = (uid: string, data: Record<string, unknown>): UserDoc => ({
  id: uid,
  ref: { path: `users/${uid}` },
  data: (): Record<string, unknown> => data,
});

const users = [
  userDoc(STALE_UID, {
    biteCount: 1,
    postingStreak: { weeks: 2, lastPostingWeek: '2026-11-09' },
  }),
  userDoc(SETTLED_UID, {
    biteCount: 1,
    postingStreak: { weeks: 1, lastPostingWeek: '2026-11-16' },
  }),
];

type BitesQuery = {
  select: () => BitesQuery;
  count: () => { get: () => Promise<{ data: () => { count: number } }> };
  get: () => Promise<{ docs: { get: () => number }[] }>;
};

const bitesQuery = (uid: string): BitesQuery => {
  const query: BitesQuery = {
    select: (): BitesQuery => query,
    count: () => ({
      get: async () => ({ data: () => ({ count: bitesByUser[uid].length }) }),
    }),
    get: async () => ({
      docs: bitesByUser[uid].map((value) => ({ get: (): number => value })),
    }),
  };

  return query;
};

const fakeFirestore = {
  collection: (name: string): unknown =>
    name === 'users'
      ? {
          get: async (): Promise<unknown> => ({
            size: users.length,
            docs: users,
          }),
        }
      : {
          where: (_field: string, _op: string, uid: string): BitesQuery =>
            bitesQuery(uid),
        },
  batch: (): unknown => ({
    update: (ref: { path: string }, data: Record<string, unknown>): number =>
      updates.push({ path: ref.path, data }),
    commit,
  }),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => fakeFirestore),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

import { resyncBiteCounts } from '../resync-bite-counts';

describe('resyncBiteCounts posting streak (issue #2146)', () => {
  it('rewrites only the stale streak, and leaves a right count alone', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    await (resyncBiteCounts as unknown as () => Promise<void>)();

    expect(updates).toEqual([
      {
        path: `users/${STALE_UID}`,
        data: {
          postingStreak: { weeks: 0, lastPostingWeek: '2026-11-09' },
          updatedAt: 'server-timestamp',
        },
      },
    ]);
    expect(commit).toHaveBeenCalledTimes(1);
  });
});

import { Firestore } from 'firebase-admin/firestore';
import {
  applyBiteToPostingStreak,
  recomputeUserPostingStreak,
} from '../user-posting-streak';

const at = (iso: string): number => Date.parse(iso);

// Wednesday 18 November 2026; its Zurich week starts Monday 16 November.
const NOW = at('2026-11-18T11:00:00Z');

type FakeUser = { exists: boolean; data: Record<string, unknown> };

type FakeDb = {
  db: Firestore;
  updates: Record<string, unknown>[];
  where: jest.Mock;
  query: { select: jest.Mock; get: jest.Mock };
  transaction: { get: jest.Mock; update: jest.Mock };
};

/**
 * Just enough of Firestore for the streak: one user document, the user's
 * Bites behind a `where().select()` query, and a transaction that records
 * its updates.
 */
const fakeDb = (user: FakeUser, creationTimes: unknown[]): FakeDb => {
  const updates: Record<string, unknown>[] = [];
  const querySnapshot = {
    docs: creationTimes.map((value) => ({
      get: (field: string): unknown =>
        field === 'createdAtTimestamp' ? value : undefined,
    })),
  };
  const query = {
    select: jest.fn(() => query),
    get: jest.fn(async () => querySnapshot),
  };
  const where = jest.fn(() => query);
  const userRef = { path: 'users/u1' };
  const userSnap = {
    exists: user.exists,
    get: (field: string): unknown => user.data[field],
  };
  const transaction = {
    get: jest.fn(async (target: unknown) =>
      target === userRef ? userSnap : querySnapshot,
    ),
    update: jest.fn((_ref: unknown, data: Record<string, unknown>) => {
      updates.push(data);
    }),
  };
  const db = {
    doc: jest.fn(() => userRef),
    collection: jest.fn(() => ({ where })),
    runTransaction: jest.fn(
      async (fn: (t: typeof transaction) => Promise<unknown>) =>
        fn(transaction),
    ),
  } as unknown as Firestore;

  return { db, updates, where, query, transaction };
};

describe('user posting streak (issue #2146)', () => {
  it('recomputes from the creation times of the user’s Bites only', async () => {
    const { db, where, query } = fakeDb({ exists: true, data: {} }, [
      at('2026-11-17T09:00:00Z'),
      at('2026-11-10T09:00:00Z'),
      'not-a-number',
    ]);

    await expect(recomputeUserPostingStreak(db, 'u1', NOW)).resolves.toEqual({
      weeks: 2,
      lastPostingWeek: '2026-11-16',
    });
    expect(where).toHaveBeenCalledWith('userId', '==', 'u1');
    expect(query.select).toHaveBeenCalledWith('createdAtTimestamp');
  });

  it('advances the stored streak without reading the Bites', async () => {
    const { db, updates, transaction } = fakeDb(
      {
        exists: true,
        data: { postingStreak: { weeks: 3, lastPostingWeek: '2026-11-09' } },
      },
      [],
    );

    await expect(applyBiteToPostingStreak(db, 'u1', NOW, NOW)).resolves.toEqual(
      { weeks: 4, lastPostingWeek: '2026-11-16' },
    );
    expect(transaction.get).toHaveBeenCalledTimes(1);
    expect(updates).toEqual([
      { postingStreak: { weeks: 4, lastPostingWeek: '2026-11-16' } },
    ]);
  });

  it('writes nothing for another Bite in the same week', async () => {
    const { db, updates } = fakeDb(
      {
        exists: true,
        data: { postingStreak: { weeks: 4, lastPostingWeek: '2026-11-16' } },
      },
      [],
    );

    await applyBiteToPostingStreak(db, 'u1', NOW, NOW);

    expect(updates).toEqual([]);
  });

  it('builds the history from the Bites on a user’s first streak', async () => {
    const { db, updates } = fakeDb({ exists: true, data: {} }, [
      at('2026-11-10T09:00:00Z'),
      at('2026-11-03T09:00:00Z'),
    ]);

    await applyBiteToPostingStreak(db, 'u1', NOW, NOW);

    // The new Bite counts even when the query does not return it.
    expect(updates).toEqual([
      { postingStreak: { weeks: 3, lastPostingWeek: '2026-11-16' } },
    ]);
  });

  it('recomputes for a Bite older than the stored last week', async () => {
    const lateBite = at('2026-11-03T09:00:00Z');
    const { db, updates } = fakeDb(
      {
        exists: true,
        data: { postingStreak: { weeks: 1, lastPostingWeek: '2026-11-16' } },
      },
      [at('2026-11-17T09:00:00Z'), at('2026-11-10T09:00:00Z'), lateBite],
    );

    await applyBiteToPostingStreak(db, 'u1', lateBite, NOW);

    expect(updates).toEqual([
      { postingStreak: { weeks: 3, lastPostingWeek: '2026-11-16' } },
    ]);
  });

  it('writes nothing for a user document that does not exist', async () => {
    const { db, updates } = fakeDb({ exists: false, data: {} }, []);

    await applyBiteToPostingStreak(db, 'u1', NOW, NOW);

    expect(updates).toEqual([]);
  });
});

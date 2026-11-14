import type { Firestore } from 'firebase-admin/firestore';
import { createTranslate } from '../../i18n/translate';
import { buildCollapseKey } from '../notification-collapse';
import {
  buildMostLikedNotificationBody,
  collectMostLiked,
  computeBiteRankChanges,
  MostLikedBite,
  recordLike,
  removeLike,
} from '../weekly-most-liked';
import { weekOf } from '../weekly-leaderboard';

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    increment: jest.fn((by: number) => ({ increment: by })),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

type Data = Record<string, unknown>;

const at = (iso: string): number => Date.parse(iso);
const NOW = at('2026-11-14T15:30:00Z');
const NEXT_WEEK = at('2026-11-17T09:00:00Z');

/**
 * A Firestore stand-in for the like counting: documents by path, `set` with
 * `merge` and `FieldValue.increment`, and transactions that run straight
 * through.
 */
const fakeStore = (
  initial: Record<string, Data> = {},
): { db: Firestore; docs: Map<string, Data> } => {
  const docs = new Map(Object.entries(initial));

  const write = (path: string, data: Data, merge: boolean): void => {
    const next: Data = merge ? { ...(docs.get(path) ?? {}) } : {};

    for (const [key, value] of Object.entries(data)) {
      const increment = (value as { increment?: number } | null)?.increment;

      next[key] =
        typeof increment === 'number'
          ? ((next[key] as number | undefined) ?? 0) + increment
          : value;
    }

    docs.set(path, next);
  };

  const ref = (path: string): { path: string } => ({ path });
  const snapshot = (
    path: string,
  ): { exists: boolean; data: () => Data | undefined } => {
    // A snapshot holds the document as it was when it was read.
    const value = docs.get(path);

    return { exists: value !== undefined, data: (): Data | undefined => value };
  };

  const db = {
    collection: (name: string): { doc: (id: string) => { path: string } } => ({
      doc: (id: string): { path: string } => ref(`${name}/${id}`),
    }),
    runTransaction: async <T>(
      run: (transaction: unknown) => Promise<T>,
    ): Promise<T> =>
      run({
        get: async (r: {
          path: string;
        }): Promise<{ exists: boolean; data: () => Data | undefined }> =>
          snapshot(r.path),
        set: (
          r: { path: string },
          data: Data,
          options?: { merge?: boolean },
        ): void => write(r.path, data, !!options?.merge),
        delete: (r: { path: string }): void => {
          docs.delete(r.path);
        },
      }),
  } as unknown as Firestore;

  return { db, docs };
};

describe('recordLike / removeLike', () => {
  it('counts a like for the week the backend sees it in', async () => {
    const { db, docs } = fakeStore();

    expect(await recordLike(db, 'bite-1', 'ana', NOW)).toBe(true);

    expect(docs.get('weeklyBiteLikes/2026-11-09_bite-1')).toMatchObject({
      week: '2026-11-09',
      biteId: 'bite-1',
      likes: 1,
    });
  });

  it('counts a retried trigger once', async () => {
    const { db, docs } = fakeStore();

    await recordLike(db, 'bite-1', 'ana', NOW);
    expect(await recordLike(db, 'bite-1', 'ana', NOW)).toBe(false);

    expect(docs.get('weeklyBiteLikes/2026-11-09_bite-1')?.['likes']).toBe(1);
  });

  it('takes a removed like off the running week', async () => {
    const { db, docs } = fakeStore();

    await recordLike(db, 'bite-1', 'ana', NOW);
    await recordLike(db, 'bite-1', 'ben', NOW);
    expect(await removeLike(db, 'bite-1', 'ana', NOW)).toBe(true);

    expect(docs.get('weeklyBiteLikes/2026-11-09_bite-1')?.['likes']).toBe(1);
    expect(docs.has('likeWeeks/bite-1_ana')).toBe(false);
  });

  it('leaves a frozen week alone when a like from it is removed later', async () => {
    const { db, docs } = fakeStore();

    await recordLike(db, 'bite-1', 'ana', NOW);
    expect(await removeLike(db, 'bite-1', 'ana', NEXT_WEEK)).toBe(false);

    expect(docs.get('weeklyBiteLikes/2026-11-09_bite-1')?.['likes']).toBe(1);
    expect(docs.has('weeklyBiteLikes/2026-11-16_bite-1')).toBe(false);
  });
});

describe('collectMostLiked', () => {
  const counts = [
    { biteId: 'top', likes: 9 },
    { biteId: 'private-author', likes: 8 },
    { biteId: 'deleted', likes: 7 },
    { biteId: 'uploading', likes: 6 },
    { biteId: 'second-by-same-author', likes: 5 },
  ];
  const bites: Record<string, Data> = {
    top: { userId: 'ana', name: 'Mantı', imagePath: 'https://img/top' },
    'private-author': { userId: 'secret', name: 'Hidden' },
    uploading: { userId: 'ana', name: 'Ćevapi', imageStatus: 'pending' },
    'second-by-same-author': { userId: 'ana', name: 'Burek', image: 'legacy' },
  };
  const users: Record<string, Data> = {
    ana: { public: true, displayName: 'Ana' },
    secret: { public: false, displayName: 'Secret' },
  };

  interface CountPage {
    empty: boolean;
    size: number;
    docs: { data: () => Data }[];
  }
  // where(week).where(likes > 0).orderBy(likes).limit(n).get()
  const countQuery = {
    where: (): unknown => countQuery,
    orderBy: (): unknown => countQuery,
    limit: (): unknown => countQuery,
    get: async (): Promise<CountPage> => ({
      empty: false,
      size: counts.length,
      docs: counts.map((count) => ({ data: (): Data => count })),
    }),
  };

  const db = {
    collection: (
      name: string,
    ): {
      where: () => unknown;
      doc: (id: string) => { name: string; id: string };
    } => ({
      where: (): unknown => countQuery,
      doc: (id: string): { name: string; id: string } => ({ name, id }),
    }),
    getAll: async (
      ...refs: { name: string; id: string }[]
    ): Promise<{ id: string; data: () => Data | undefined }[]> =>
      refs.map((ref) => ({
        id: ref.id,
        data: (): Data | undefined =>
          ref.name === 'bites' ? bites[ref.id] : users[ref.id],
      })),
  } as unknown as Firestore;

  it('ranks Bites by this week’s likes and skips what other people may not see', async () => {
    const ranking = await collectMostLiked(db, weekOf(NOW));

    expect(ranking).toEqual([
      {
        biteId: 'top',
        name: 'Mantı',
        imageUrl: 'https://img/top',
        userId: 'ana',
        displayName: 'Ana',
        likeCount: 9,
      },
      {
        biteId: 'second-by-same-author',
        name: 'Burek',
        imageUrl: 'legacy',
        userId: 'ana',
        displayName: 'Ana',
        likeCount: 5,
      },
    ]);
  });
});

const bite = (biteId: string, userId = 'ana'): MostLikedBite => ({
  biteId,
  name: `Dish ${biteId}`,
  imageUrl: '',
  userId,
  displayName: userId,
  likeCount: 1,
});

describe('computeBiteRankChanges', () => {
  it('reports each Bite of one creator on its own, to that creator', () => {
    const changes = computeBiteRankChanges(
      [bite('a'), bite('b')],
      [bite('b'), bite('a'), bite('c', 'ben')],
    );

    expect(
      changes.map((c) => [c.biteId, c.userId, c.previousRank, c.currentRank]),
    ).toEqual([
      ['b', 'ana', 2, 1],
      ['a', 'ana', 1, 2],
      ['c', 'ben', null, 3],
    ]);
  });

  it('names a Bite that dropped out from the previous board', () => {
    const [change] = computeBiteRankChanges([bite('gone')], []);

    expect(change).toMatchObject({
      biteId: 'gone',
      name: 'Dish gone',
      currentRank: null,
    });
  });
});

describe('buildMostLikedNotificationBody', () => {
  const translate = createTranslate('en');
  const change = {
    biteId: 'a',
    userId: 'ana',
    name: 'Mantı',
    previousRank: 4,
    currentRank: 2,
    direction: 'up' as const,
  };

  it('names the dish and the new rank', () => {
    expect(buildMostLikedNotificationBody(change, translate)).toBe(
      'Your Bite Mantı climbed to #2 on the most liked list! 🎉',
    );
  });

  it('describes an entry into the top 10', () => {
    expect(
      buildMostLikedNotificationBody(
        { ...change, previousRank: null },
        translate,
      ),
    ).toBe('Your Bite Mantı entered the top 10 most liked at #2! 🎉');
  });

  it('reads in the recipient language', () => {
    expect(
      buildMostLikedNotificationBody(
        { ...change, direction: 'down', previousRank: 1 },
        createTranslate('de'),
      ),
    ).toBe('Dein Bite Mantı ist auf Platz 2 der meistgelikten gefallen.');
  });
});

describe('collapse key of a Most liked rank change', () => {
  it('keeps two Bites apart and stays on the leaderboard surface', () => {
    const key = (biteId: string): string | undefined =>
      buildCollapseKey({
        type: 'LEADERBOARD_RANK_CHANGE',
        board: 'mostLiked',
        biteId,
      });

    expect(key('a')).toBe('LEADERBOARD_RANK_CHANGE:LEADERBOARD_RANK_CHANGE:a');
    expect(key('a')).not.toBe(key('b'));
    expect(buildCollapseKey({ type: 'LEADERBOARD_RANK_CHANGE' })).toBe(
      'LEADERBOARD_RANK_CHANGE',
    );
  });
});

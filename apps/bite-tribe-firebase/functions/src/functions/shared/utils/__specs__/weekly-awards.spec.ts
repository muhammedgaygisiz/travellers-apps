import type { Firestore } from 'firebase-admin/firestore';
import { createTranslate } from '../../i18n/translate';
import { buildCollapseKey } from '../notification-collapse';
import type { LeaderboardUser } from '../leaderboard';
import type { MostLikedBite } from '../weekly-most-liked';
import {
  awardWeeklyBadges,
  bestBadge,
  buildWeeklyAwardBody,
  computeWeeklyBadges,
  WeeklyBadge,
} from '../weekly-awards';

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
    delete: jest.fn(() => 'delete-field'),
  },
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const WEEK = '2026-11-09';

const user = (userId: string): LeaderboardUser => ({
  userId,
  displayName: userId,
  photoUrl: '',
  public: true,
  biteCount: 1,
});

const bite = (biteId: string, userId: string): MostLikedBite => ({
  biteId,
  name: biteId,
  imageUrl: '',
  userId,
  displayName: userId,
  likeCount: 1,
});

describe('computeWeeklyBadges', () => {
  it('gives the top 3 of each list a badge, and places 4 and on nothing', () => {
    const badges = computeWeeklyBadges(
      WEEK,
      ['ana', 'ben', 'cem', 'dan'].map(user),
      [
        bite('b1', 'eva'),
        bite('b2', 'fay'),
        bite('b3', 'gus'),
        bite('b4', 'hal'),
      ],
    );

    expect([...badges.keys()]).toEqual([
      'ana',
      'ben',
      'cem',
      'eva',
      'fay',
      'gus',
    ]);
    expect(badges.get('ben')).toEqual([
      { board: 'thisWeek', place: 2, week: WEEK },
    ]);
    expect(badges.get('gus')).toEqual([
      { board: 'mostLiked', place: 3, week: WEEK },
    ]);
  });

  it('gives a creator with several top-3 Bites one badge for the best place', () => {
    const badges = computeWeeklyBadges(
      WEEK,
      [],
      [bite('b1', 'eva'), bite('b2', 'fay'), bite('b3', 'eva')],
    );

    expect(badges.get('eva')).toEqual([
      { board: 'mostLiked', place: 1, week: WEEK },
    ]);
  });

  it('gives a user in both lists both badges, This week first', () => {
    const badges = computeWeeklyBadges(
      WEEK,
      [user('x'), user('ana')],
      [bite('b1', 'ana')],
    );

    expect(badges.get('ana')?.map((b) => [b.board, b.place])).toEqual([
      ['thisWeek', 2],
      ['mostLiked', 1],
    ]);
  });
});

describe('bestBadge', () => {
  it('names the better place, and This week on a tie', () => {
    const thisWeek: WeeklyBadge = { board: 'thisWeek', place: 2, week: WEEK };
    const mostLiked: WeeklyBadge = { board: 'mostLiked', place: 1, week: WEEK };

    expect(bestBadge([thisWeek, mostLiked])).toBe(mostLiked);
    expect(bestBadge([{ ...mostLiked, place: 2 }, thisWeek])).toBe(thisWeek);
  });
});

describe('buildWeeklyAwardBody', () => {
  it('congratulates on the place and the list, in the winner’s language', () => {
    expect(
      buildWeeklyAwardBody(
        { board: 'thisWeek', place: 1, week: WEEK },
        createTranslate('en'),
      ),
    ).toBe('Congrats, you finished #1 on the leaderboard this week!');
    expect(
      buildWeeklyAwardBody(
        { board: 'mostLiked', place: 3, week: WEEK },
        createTranslate('de'),
      ),
    ).toBe(
      'Glückwunsch, dein Bite hat die Woche auf Platz 3 der meistgelikten beendet!',
    );
  });
});

describe('the award push', () => {
  it('collapses onto the previous week’s and is cleared by the leaderboard', () => {
    expect(buildCollapseKey({ type: 'WEEKLY_AWARD', board: 'lastWeek' })).toBe(
      'WEEKLY_AWARD:LEADERBOARD_RANK_CHANGE',
    );
  });
});

describe('awardWeeklyBadges', () => {
  type Write = [op: string, path: string, data: unknown];

  const fakeDb = (
    users: Record<string, boolean>,
    record?: Record<string, unknown>,
  ): { db: Firestore; writes: Write[] } => {
    const writes: Write[] = [];
    const ref = (path: string): { path: string } => ({ path });

    const db = {
      collection: (
        name: string,
      ): { doc: (id: string) => { path: string } } => ({
        doc: (id: string): { path: string } => ref(`${name}/${id}`),
      }),
      getAll: async (
        ...refs: { path: string }[]
      ): Promise<{ exists: boolean; ref: { path: string } }[]> =>
        refs.map((r) => ({ exists: !!users[r.path.split('/')[1]], ref: r })),
      batch: (): unknown => ({
        update: (r: { path: string }, data: unknown): void => {
          writes.push(['update', r.path, data]);
        },
        set: (r: { path: string }, data: unknown): void => {
          writes.push(['set', r.path, data]);
        },
        commit: async (): Promise<void> => undefined,
      }),
    } as unknown as Firestore;

    // The record read happens through collection().doc().get().
    const collection = db.collection.bind(db);
    (db as unknown as { collection: unknown }).collection = (
      name: string,
    ): unknown => {
      const c = collection(name);

      return {
        doc: (id: string): unknown => ({
          ...c.doc(id),
          get: async (): Promise<{ data: () => unknown }> => ({
            data: (): unknown =>
              name === 'meta' && id === 'weeklyAwards' ? record : undefined,
          }),
        }),
      };
    };

    return { db, writes };
  };

  it('moves the badges from last week’s holders to this week’s winners', async () => {
    const { db, writes } = fakeDb(
      { ana: true, old: true, ben: true },
      { week: '2026-11-02', userIds: ['old', 'ana'] },
    );

    const awarded = await awardWeeklyBadges(
      db,
      WEEK,
      [user('ana'), user('ben')],
      [],
    );

    expect([...awarded.keys()]).toEqual(['ana', 'ben']);
    expect(writes).toEqual([
      ['update', 'users/old', { weeklyBadges: 'delete-field' }],
      [
        'update',
        'users/ana',
        { weeklyBadges: [{ board: 'thisWeek', place: 1, week: WEEK }] },
      ],
      [
        'update',
        'users/ben',
        { weeklyBadges: [{ board: 'thisWeek', place: 2, week: WEEK }] },
      ],
      [
        'set',
        'meta/weeklyAwards',
        { week: WEEK, userIds: ['ana', 'ben'], awardedAt: 'server-timestamp' },
      ],
    ]);
  });

  it('never recreates a deleted account', async () => {
    const { db, writes } = fakeDb(
      { ana: true },
      { week: '2026-11-02', userIds: ['gone-holder'] },
    );

    const awarded = await awardWeeklyBadges(
      db,
      WEEK,
      [user('ana'), user('gone-winner')],
      [],
    );

    expect([...awarded.keys()]).toEqual(['ana']);
    expect(writes.map(([op, path]) => `${op} ${path}`)).toEqual([
      'update users/ana',
      'set meta/weeklyAwards',
    ]);
  });

  it('awards a week once, so a retried reset neither rewrites nor pushes', async () => {
    const { db, writes } = fakeDb(
      { ana: true },
      { week: WEEK, userIds: ['ana'] },
    );

    const awarded = await awardWeeklyBadges(db, WEEK, [user('ana')], []);

    expect(awarded.size).toBe(0);
    expect(writes).toEqual([]);
  });
});

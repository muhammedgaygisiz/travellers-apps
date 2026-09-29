import {
  loadVisibleWeeklyBites,
  resolveWeekBounds,
} from '../load-weekly-bites';
import type { Query } from 'firebase-admin/firestore';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

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

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

describe('resolveWeekBounds', () => {
  // Monday 2025-07-21, the day the weekly notification fires.
  const now = new Date('2025-07-21T16:00:00Z');
  const previousWeek = {
    start: Date.UTC(2025, 6, 13, 22, 0, 0, 0),
    end: Date.UTC(2025, 6, 20, 21, 59, 59, 999),
  };

  it('keeps the range the notification carried', () => {
    expect(
      resolveWeekBounds({ weekStart: 1_000, weekEnd: 2_000 }, now),
    ).toEqual({ start: 1_000, end: 2_000 });
  });

  it('accepts the stringified numbers a push payload delivers', () => {
    expect(
      resolveWeekBounds({ weekStart: '1000', weekEnd: '2000' }, now),
    ).toEqual({ start: 1_000, end: 2_000 });
  });

  it('falls back to the previous week without a range', () => {
    expect(resolveWeekBounds({}, now)).toEqual(previousWeek);
  });

  it.each([
    ['non-numeric values', { weekStart: 'last-week', weekEnd: 'now' }],
    ['a partial range', { weekStart: 1_000 }],
    ['an inverted range', { weekStart: 2_000, weekEnd: 1_000 }],
  ])('falls back to the previous week for %s', (_case, data) => {
    expect(resolveWeekBounds(data, now)).toEqual(previousWeek);
  });
});

describe('loadVisibleWeeklyBites', () => {
  const PAGE = 200;

  const doc = (
    id: string,
    overrides: Record<string, unknown> = {},
  ): { id: string; data: () => Record<string, unknown> } => ({
    id,
    data: () => ({ userId: 'poster', imageStatus: 'uploaded', ...overrides }),
  });

  /**
   * A query over a fixed newest-first list that honours `startAfter` and
   * `limit`, which is all the pager asks of Firestore.
   */
  const queryOver = (
    docs: ReturnType<typeof doc>[],
  ): { query: Query; limit: jest.Mock } => {
    const limit = jest.fn();

    const from = (offset: number): unknown => ({
      startAfter: (cursor: ReturnType<typeof doc>): unknown =>
        from(docs.indexOf(cursor) + 1),
      limit: (size: number): unknown => {
        limit(size);

        const page = docs.slice(offset, offset + size);

        return { get: async () => ({ size: page.length, docs: page }) };
      },
    });

    return { query: from(0) as Query, limit };
  };

  it('reads once when the week fits in one page', async () => {
    const { query, limit } = queryOver([doc('a'), doc('b')]);

    const { bites, read } = await loadVisibleWeeklyBites(query, 'viewer');

    expect(bites.map((bite) => bite.id)).toEqual(['a', 'b']);
    expect(read).toBe(2);
    expect(limit).toHaveBeenCalledTimes(1);
  });

  it('hides a non-listable Bite from somebody else', async () => {
    const { query } = queryOver([
      doc('listed'),
      doc('failed', { imageStatus: 'failed' }),
      doc('legacy', { imageStatus: undefined }),
    ]);

    const { bites } = await loadVisibleWeeklyBites(query, 'viewer');

    expect(bites.map((bite) => bite.id)).toEqual(['listed']);
  });

  it('returns a non-listable Bite to its creator', async () => {
    const { query } = queryOver([doc('failed', { imageStatus: 'failed' })]);

    const { bites } = await loadVisibleWeeklyBites(query, 'poster');

    expect(bites.map((bite) => bite.id)).toEqual(['failed']);
  });

  /**
   * The filter runs before the cap: hidden Bites inside the first page must
   * not shorten it while visible ones are still waiting after it.
   */
  it('fills the page past hidden Bites instead of returning short', async () => {
    const hidden = Array.from({ length: 50 }, (_, i) =>
      doc(`hidden-${i}`, { imageStatus: 'failed' }),
    );
    const visible = Array.from({ length: PAGE }, (_, i) => doc(`visible-${i}`));
    const { query, limit } = queryOver([...hidden, ...visible]);

    const { bites } = await loadVisibleWeeklyBites(query, 'viewer');

    expect(bites).toHaveLength(PAGE);
    expect(bites[0].id).toBe('visible-0');
    expect(bites[PAGE - 1].id).toBe(`visible-${PAGE - 1}`);
    expect(limit).toHaveBeenCalledTimes(2);
  });
});

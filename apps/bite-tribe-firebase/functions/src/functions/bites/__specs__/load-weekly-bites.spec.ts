import { resolveWeekBounds } from '../load-weekly-bites';

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

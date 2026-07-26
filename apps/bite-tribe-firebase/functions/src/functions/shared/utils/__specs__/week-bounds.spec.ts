import {
  getPreviousWeekBounds,
  toEndOfDayZurich,
  toMidnightZurich,
} from '../week-bounds';

describe('week-bounds', () => {
  describe('toMidnightZurich', () => {
    it('resolves winter time (UTC+1) midnight', () => {
      expect(new Date(toMidnightZurich(2025, 1, 15)).toISOString()).toBe(
        '2025-01-14T23:00:00.000Z',
      );
    });

    it('resolves summer time (UTC+2) midnight', () => {
      expect(new Date(toMidnightZurich(2025, 7, 15)).toISOString()).toBe(
        '2025-07-14T22:00:00.000Z',
      );
    });
  });

  describe('toEndOfDayZurich', () => {
    it('ends one millisecond before the next Zurich midnight', () => {
      expect(new Date(toEndOfDayZurich(2025, 7, 20)).toISOString()).toBe(
        '2025-07-20T21:59:59.999Z',
      );
    });

    it('rolls over into the next month', () => {
      expect(new Date(toEndOfDayZurich(2025, 7, 31)).toISOString()).toBe(
        '2025-07-31T21:59:59.999Z',
      );
    });
  });

  describe('getPreviousWeekBounds', () => {
    it('spans the Monday to Sunday before the scheduler Monday', () => {
      // Monday 2025-07-21, when the scheduler fires.
      const bounds = getPreviousWeekBounds(new Date('2025-07-21T16:00:00Z'));

      expect(new Date(bounds.start).toISOString()).toBe(
        '2025-07-13T22:00:00.000Z',
      );
      expect(new Date(bounds.end).toISOString()).toBe(
        '2025-07-20T21:59:59.999Z',
      );
    });

    it('resolves the same week on any later weekday', () => {
      // A user opening the notification on Thursday must still see the week the
      // Monday notification counted.
      const monday = getPreviousWeekBounds(new Date('2025-07-21T16:00:00Z'));
      const thursday = getPreviousWeekBounds(new Date('2025-07-24T09:00:00Z'));
      const sunday = getPreviousWeekBounds(new Date('2025-07-27T12:00:00Z'));

      expect(thursday).toEqual(monday);
      expect(sunday).toEqual(monday);
    });

    it('moves on once the next week starts', () => {
      const thisWeek = getPreviousWeekBounds(new Date('2025-07-21T16:00:00Z'));
      const nextWeek = getPreviousWeekBounds(new Date('2025-07-28T16:00:00Z'));

      expect(nextWeek.start).toBeGreaterThan(thisWeek.start);
      expect(new Date(nextWeek.start).toISOString()).toBe(
        '2025-07-20T22:00:00.000Z',
      );
    });
  });
});

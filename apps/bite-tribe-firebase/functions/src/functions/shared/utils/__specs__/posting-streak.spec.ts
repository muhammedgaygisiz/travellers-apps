import {
  advancePostingStreak,
  computePostingStreak,
  postingWeekOf,
  readPostingStreak,
  samePostingStreak,
  shiftPostingWeek,
  NO_POSTING_STREAK_STATS,
  PostingStreak,
  tallyPostingStreak,
} from '../posting-streak';

const at = (iso: string): number => Date.parse(iso);

// Wednesday 18 November 2026, noon in Zurich (UTC+1). Its week starts Monday
// 16 November.
const WEDNESDAY = at('2026-11-18T11:00:00Z');

describe('posting streak (issue #2146)', () => {
  describe('postingWeekOf', () => {
    it('keys a week by its Zurich Monday', () => {
      expect(postingWeekOf(WEDNESDAY)).toBe('2026-11-16');
    });

    it('counts Sunday 23:30 Zurich for that week and Monday 00:10 for the next, in winter time', () => {
      // Winter: Zurich is UTC+1.
      expect(postingWeekOf(at('2026-11-22T22:30:00Z'))).toBe('2026-11-16');
      expect(postingWeekOf(at('2026-11-22T23:10:00Z'))).toBe('2026-11-23');
    });

    it('counts Sunday 23:30 Zurich for that week and Monday 00:10 for the next, in summer time', () => {
      // Summer: Zurich is UTC+2.
      expect(postingWeekOf(at('2026-07-12T21:30:00Z'))).toBe('2026-07-06');
      expect(postingWeekOf(at('2026-07-12T22:10:00Z'))).toBe('2026-07-13');
    });

    it('is not moved by the night the clocks change', () => {
      // Clocks go back on Sunday 25 October 2026.
      expect(postingWeekOf(at('2026-10-25T22:30:00Z'))).toBe('2026-10-19');
      expect(postingWeekOf(at('2026-10-25T23:10:00Z'))).toBe('2026-10-26');
    });
  });

  it('steps weeks on calendar dates across a DST change and a year end', () => {
    expect(shiftPostingWeek('2026-10-19', 1)).toBe('2026-10-26');
    expect(shiftPostingWeek('2026-12-28', 1)).toBe('2027-01-04');
    expect(shiftPostingWeek('2026-11-16', -1)).toBe('2026-11-09');
  });

  describe('computePostingStreak', () => {
    it('is 0 with no Bite', () => {
      expect(computePostingStreak([], WEDNESDAY)).toEqual({
        weeks: 0,
        lastPostingWeek: null,
      });
    });

    it('counts 3 for a Bite in each of the last 3 weeks, the current one included', () => {
      expect(
        computePostingStreak(
          [
            at('2026-11-17T09:00:00Z'),
            at('2026-11-10T09:00:00Z'),
            at('2026-11-03T09:00:00Z'),
          ],
          WEDNESDAY,
        ),
      ).toEqual({ weeks: 3, lastPostingWeek: '2026-11-16' });
    });

    it('does not count the current week against the user', () => {
      // 4 weeks up to last week, the last Bite on last Sunday evening.
      expect(
        computePostingStreak(
          [
            at('2026-11-15T19:00:00Z'),
            at('2026-11-04T09:00:00Z'),
            at('2026-10-28T09:00:00Z'),
            at('2026-10-20T09:00:00Z'),
          ],
          WEDNESDAY,
        ),
      ).toEqual({ weeks: 4, lastPostingWeek: '2026-11-09' });
    });

    it('is 0 once a whole week has passed without a Bite', () => {
      expect(
        computePostingStreak(
          [at('2026-11-04T09:00:00Z'), at('2026-10-28T09:00:00Z')],
          WEDNESDAY,
        ),
      ).toEqual({ weeks: 0, lastPostingWeek: '2026-11-02' });
    });

    it('stops at a week with no Bite, as after deleting its only Bite', () => {
      expect(
        computePostingStreak(
          [
            at('2026-11-17T09:00:00Z'),
            at('2026-11-10T09:00:00Z'),
            // nothing in the week of 2 November
            at('2026-10-27T09:00:00Z'),
            at('2026-10-20T09:00:00Z'),
          ],
          WEDNESDAY,
        ),
      ).toEqual({ weeks: 2, lastPostingWeek: '2026-11-16' });
    });

    it('counts several Bites in one week once', () => {
      expect(
        computePostingStreak(
          [at('2026-11-16T09:00:00Z'), at('2026-11-17T09:00:00Z')],
          WEDNESDAY,
        ),
      ).toEqual({ weeks: 1, lastPostingWeek: '2026-11-16' });
    });

    it('ignores a creation time that is not a number', () => {
      expect(computePostingStreak([Number.NaN], WEDNESDAY)).toEqual({
        weeks: 0,
        lastPostingWeek: null,
      });
    });
  });

  describe('advancePostingStreak', () => {
    const stored = { weeks: 3, lastPostingWeek: '2026-11-09' };

    it('asks for a recompute when nothing is stored yet', () => {
      expect(advancePostingStreak(null, WEDNESDAY)).toBeNull();
      expect(
        advancePostingStreak({ weeks: 0, lastPostingWeek: null }, WEDNESDAY),
      ).toBeNull();
    });

    it('adds a week for a Bite in the week after the last one', () => {
      expect(advancePostingStreak(stored, WEDNESDAY)).toEqual({
        weeks: 4,
        lastPostingWeek: '2026-11-16',
      });
    });

    it('changes nothing for another Bite in the last week', () => {
      expect(advancePostingStreak(stored, at('2026-11-12T09:00:00Z'))).toEqual(
        stored,
      );
    });

    it('starts again at 1 after a missed week', () => {
      expect(
        advancePostingStreak(
          { weeks: 5, lastPostingWeek: '2026-11-02' },
          WEDNESDAY,
        ),
      ).toEqual({ weeks: 1, lastPostingWeek: '2026-11-16' });
    });

    it('asks for a recompute for a Bite older than the last week', () => {
      expect(
        advancePostingStreak(stored, at('2026-11-03T09:00:00Z')),
      ).toBeNull();
    });
  });

  it('reads only a well-formed stored value', () => {
    expect(
      readPostingStreak({ weeks: 2, lastPostingWeek: '2026-11-09' }),
    ).toEqual({ weeks: 2, lastPostingWeek: '2026-11-09' });
    expect(readPostingStreak({ weeks: 0, lastPostingWeek: null })).toEqual({
      weeks: 0,
      lastPostingWeek: null,
    });
    expect(readPostingStreak(undefined)).toBeNull();
    expect(readPostingStreak({ weeks: '2' })).toBeNull();
  });

  it('compares two values by their fields', () => {
    const value = { weeks: 2, lastPostingWeek: '2026-11-09' };

    expect(samePostingStreak({ ...value }, value)).toBe(true);
    expect(samePostingStreak(null, value)).toBe(false);
    expect(samePostingStreak({ ...value, weeks: 3 }, value)).toBe(false);
  });
});

describe('tallyPostingStreak (issue #2150)', () => {
  const week = (weeks: number): PostingStreak => ({
    weeks,
    lastPostingWeek: '2026-11-16',
  });

  it('counts a recomputed streak of 2 weeks or more', () => {
    const stats = [week(1), week(2), week(5)].reduce(
      (sum, value) => tallyPostingStreak(sum, value, value),
      NO_POSTING_STREAK_STATS,
    );

    expect(stats).toEqual({ usersWithStreakOfTwoOrMore: 2, streaksBroken: 0 });
  });

  it('counts a streak broken only when it went from 1 or more to 0', () => {
    let stats = tallyPostingStreak(NO_POSTING_STREAK_STATS, week(3), week(0));
    stats = tallyPostingStreak(stats, week(0), week(0));
    stats = tallyPostingStreak(stats, null, week(0));
    stats = tallyPostingStreak(stats, week(1), week(0));

    expect(stats).toEqual({ usersWithStreakOfTwoOrMore: 0, streaksBroken: 2 });
  });
});

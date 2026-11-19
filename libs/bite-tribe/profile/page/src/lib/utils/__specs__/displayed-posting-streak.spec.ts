import { displayedPostingStreak } from '../displayed-posting-streak';

// Wednesday 18 November 2026; last week's Zurich Monday is 9 November.
const WEDNESDAY = Date.parse('2026-11-18T11:00:00Z');

describe('displayedPostingStreak (issue #2148)', () => {
  it('shows a streak of 2 or more whose run reaches this week', () => {
    expect(
      displayedPostingStreak(
        { weeks: 4, lastPostingWeek: '2026-11-16' },
        WEDNESDAY,
      ),
    ).toBe(4);
  });

  it('keeps a streak that ended last week, before this week has a Bite', () => {
    expect(
      displayedPostingStreak(
        { weeks: 3, lastPostingWeek: '2026-11-09' },
        WEDNESDAY,
      ),
    ).toBe(3);
  });

  it('shows nothing for a streak that broke since the last resync', () => {
    expect(
      displayedPostingStreak(
        { weeks: 6, lastPostingWeek: '2026-11-02' },
        WEDNESDAY,
      ),
    ).toBe(0);
  });

  it('shows nothing at 0 or 1, or without a value', () => {
    expect(
      displayedPostingStreak(
        { weeks: 1, lastPostingWeek: '2026-11-16' },
        WEDNESDAY,
      ),
    ).toBe(0);
    expect(
      displayedPostingStreak({ weeks: 0, lastPostingWeek: null }, WEDNESDAY),
    ).toBe(0);
    expect(displayedPostingStreak(undefined, WEDNESDAY)).toBe(0);
  });

  it('reads the week in Zurich time on the Sunday night before a Monday', () => {
    // Sunday 22 November 23:30 Zurich: still the week of 16 November, so a
    // run ending on 9 November is still shown.
    expect(
      displayedPostingStreak(
        { weeks: 2, lastPostingWeek: '2026-11-09' },
        Date.parse('2026-11-22T22:30:00Z'),
      ),
    ).toBe(2);
    // Monday 23 November 00:10 Zurich: a new week, and that run has broken.
    expect(
      displayedPostingStreak(
        { weeks: 2, lastPostingWeek: '2026-11-09' },
        Date.parse('2026-11-22T23:10:00Z'),
      ),
    ).toBe(0);
  });
});

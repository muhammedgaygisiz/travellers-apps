import { PostingStreak } from 'model';

/** The smallest streak the profile shows (issue #2148). */
export const MIN_SHOWN_POSTING_STREAK = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

const zurichDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The Zurich Monday, as `YYYY-MM-DD`, of the week before the one `now` falls
 * in. The same week rule as `posting-streak.ts` in the Functions (#2146):
 * Monday to Sunday in Europe/Zurich, keyed by calendar date.
 */
const previousZurichMonday = (now: number): string => {
  const day = Date.parse(`${zurichDate.format(new Date(now))}T00:00:00Z`);
  const daysSinceMonday = (new Date(day).getUTCDay() + 6) % 7;

  return new Date(day - (daysSinceMonday + 7) * DAY_MS)
    .toISOString()
    .slice(0, 10);
};

/**
 * The streak the own profile shows, or 0 when it shows none (issue #2148).
 *
 * The stored value is only recomputed on Monday, so a streak whose last
 * posting week is older than last week has broken since then and reads as 0.
 * Below `MIN_SHOWN_POSTING_STREAK` nothing is shown either, so a new or
 * lapsed user never sees an empty or broken state.
 */
export const displayedPostingStreak = (
  streak: PostingStreak | undefined,
  now: number,
): number => {
  if (
    !streak?.lastPostingWeek ||
    typeof streak.weeks !== 'number' ||
    streak.weeks < MIN_SHOWN_POSTING_STREAK ||
    streak.lastPostingWeek < previousZurichMonday(now)
  ) {
    return 0;
  }

  return streak.weeks;
};

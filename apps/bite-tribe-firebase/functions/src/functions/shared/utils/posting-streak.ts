import { ZURICH_TZ } from './week-bounds';

/**
 * The weekly posting streak (epic #2034, issue #2146): the number of
 * consecutive calendar weeks, Monday to Sunday in Europe/Zurich, in which the
 * user created at least one Bite that still exists.
 *
 * A week is keyed by its Zurich calendar Monday as `YYYY-MM-DD`, and weeks are
 * stepped on calendar dates rather than by adding milliseconds, so a DST change
 * never moves a boundary.
 */
export type PostingStreak = {
  weeks: number;
  /** The Zurich Monday of the newest posting week, or null with no Bite. */
  lastPostingWeek: string | null;
};

export const NO_POSTING_STREAK: PostingStreak = {
  weeks: 0,
  lastPostingWeek: null,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const zurichDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZURICH_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const isoDate = (utcMidnight: number): string =>
  new Date(utcMidnight).toISOString().slice(0, 10);

const utcMidnightOf = (key: string): number => Date.parse(`${key}T00:00:00Z`);

/** The Zurich Monday, as `YYYY-MM-DD`, of the week the instant falls in. */
export const postingWeekOf = (timestamp: number): string => {
  // en-CA formats as YYYY-MM-DD, the Zurich calendar date of the instant.
  const day = utcMidnightOf(zurichDate.format(new Date(timestamp)));
  const daysSinceMonday = (new Date(day).getUTCDay() + 6) % 7;

  return isoDate(day - daysSinceMonday * DAY_MS);
};

/** The Monday `count` weeks after (or before, when negative) the given one. */
export const shiftPostingWeek = (week: string, count: number): string =>
  isoDate(utcMidnightOf(week) + count * 7 * DAY_MS);

/**
 * The streak from the creation times of the Bites a user has, as of `now`.
 *
 * The run ends with the current week, or with the previous week while the
 * current week has no Bite yet, so the current week is never counted against
 * the user. Older than that, the streak is 0.
 */
export const computePostingStreak = (
  createdAtTimestamps: readonly number[],
  now: number,
): PostingStreak => {
  const weeks = new Set(
    createdAtTimestamps
      .filter((timestamp) => Number.isFinite(timestamp))
      .map(postingWeekOf),
  );

  if (weeks.size === 0) {
    return NO_POSTING_STREAK;
  }

  const lastPostingWeek = [...weeks].sort().reverse()[0];
  const currentWeek = postingWeekOf(now);

  if (lastPostingWeek < shiftPostingWeek(currentWeek, -1)) {
    return { weeks: 0, lastPostingWeek };
  }

  let count = 0;
  let week = lastPostingWeek;

  while (weeks.has(week)) {
    count++;
    week = shiftPostingWeek(week, -1);
  }

  return { weeks: count, lastPostingWeek };
};

/**
 * The streak after one new Bite, from the stored value alone, or null when it
 * has to be recomputed from all of the user's Bites: when nothing is stored
 * yet, or when the Bite is older than the stored last week (a Bite saved
 * offline and synced late).
 */
export const advancePostingStreak = (
  stored: PostingStreak | null,
  biteCreatedAt: number,
): PostingStreak | null => {
  if (!stored?.lastPostingWeek) {
    return null;
  }

  const biteWeek = postingWeekOf(biteCreatedAt);

  if (biteWeek < stored.lastPostingWeek) {
    return null;
  }

  if (biteWeek === stored.lastPostingWeek) {
    return { weeks: Math.max(stored.weeks, 1), lastPostingWeek: biteWeek };
  }

  const followsOn = biteWeek === shiftPostingWeek(stored.lastPostingWeek, 1);

  return {
    weeks: followsOn ? stored.weeks + 1 : 1,
    lastPostingWeek: biteWeek,
  };
};

/** Reads `postingStreak` from a user document, or null when it is unusable. */
export const readPostingStreak = (value: unknown): PostingStreak | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const { weeks, lastPostingWeek } = value as Record<string, unknown>;

  if (
    typeof weeks !== 'number' ||
    !(lastPostingWeek === null || typeof lastPostingWeek === 'string')
  ) {
    return null;
  }

  return { weeks, lastPostingWeek };
};

export const samePostingStreak = (
  a: PostingStreak | null,
  b: PostingStreak,
): boolean =>
  !!a && a.weeks === b.weeks && a.lastPostingWeek === b.lastPostingWeek;

/**
 * The aggregates the daily analytics digest reports (issue #2150), counted over
 * one resync run. Counts only: no user id, name or per-user value is kept.
 */
export type PostingStreakStats = {
  /** Users whose recomputed streak is 2 weeks or more. */
  usersWithStreakOfTwoOrMore: number;
  /** Users whose stored streak was 1 or more and whose recomputed one is 0. */
  streaksBroken: number;
};

export const NO_POSTING_STREAK_STATS: PostingStreakStats = {
  usersWithStreakOfTwoOrMore: 0,
  streaksBroken: 0,
};

/** Adds one user's stored and recomputed streak to the run's aggregates. */
export const tallyPostingStreak = (
  stats: PostingStreakStats,
  stored: PostingStreak | null,
  recomputed: PostingStreak,
): PostingStreakStats => ({
  usersWithStreakOfTwoOrMore:
    stats.usersWithStreakOfTwoOrMore + (recomputed.weeks >= 2 ? 1 : 0),
  streaksBroken:
    stats.streaksBroken +
    ((stored?.weeks ?? 0) >= 1 && recomputed.weeks === 0 ? 1 : 0),
});

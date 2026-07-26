export const ZURICH_TZ = 'Europe/Zurich';

/**
 * Returns the UTC timestamp (ms) for 00:00:00.000 on the given calendar date
 * in the Europe/Zurich timezone, correctly accounting for DST.
 *
 * @param year  Full calendar year (e.g. 2025).
 * @param month 1-indexed month (1 = January … 12 = December).
 * @param day   Day of the month (1-indexed).
 */
export const toMidnightZurich = (
  year: number,
  month: number,
  day: number,
): number => {
  // Start from UTC midnight of the requested date
  const utcMidnight = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`,
  );

  // Find out what wall-clock time that UTC instant corresponds to in Zurich
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ZURICH_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const [h, m, s] = timeFormatter.format(utcMidnight).split(':').map(Number);

  // Zurich is always ahead of UTC (UTC+1 or UTC+2).
  // UTC midnight therefore appears as 01:00 or 02:00 in Zurich.
  // To get Zurich midnight we subtract that offset.
  const offsetMs = (h * 3600 + m * 60 + s) * 1000;

  return utcMidnight.getTime() - offsetMs;
};

/**
 * Returns the UTC timestamp (ms) for 23:59:59.999 on the given calendar date
 * in the Europe/Zurich timezone, correctly accounting for DST.
 *
 * @param year  Full calendar year (e.g. 2025).
 * @param month 1-indexed month (1 = January … 12 = December).
 * @param day   Day of the month (1-indexed).
 */
export const toEndOfDayZurich = (
  year: number,
  month: number,
  day: number,
): number => {
  // The end of day is 1 ms before the start of the next day.
  // Use a Date so JavaScript handles month/year overflow automatically.
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return (
    toMidnightZurich(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
    ) - 1
  );
};

/**
 * Returns the [start, end] Unix-ms bounds for the calendar week before the one
 * containing `now` (Monday 00:00:00 – Sunday 23:59:59.999) in Europe/Zurich
 * time.
 *
 * The weekly notification scheduler fires on a Monday, so "today" is Monday and
 * the previous week runs from the Monday 7 days ago through the Sunday 1 day
 * ago. Any other weekday of the same week resolves to the same bounds, which is
 * what lets the weekly bites page fall back to them when a deep link carries no
 * explicit range.
 */
export const getPreviousWeekBounds = (
  now: Date = new Date(),
): { start: number; end: number } => {
  // Determine today's calendar date in Zurich timezone
  const todayZurich = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZURICH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // "YYYY-MM-DD"

  const [yearStr, monthStr, dayStr] = todayZurich.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed
  const day = parseInt(dayStr, 10);

  // Zurich weekday of "today", where Monday = 0 … Sunday = 6.
  const weekdayIndex =
    (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;

  // Walk back to this week's Monday first, so a call on any weekday resolves to
  // the same previous week: Monday of this week – 7 days through the Sunday
  // before it.
  const prevMonday = new Date(
    Date.UTC(year, month - 1, day - weekdayIndex - 7),
  );
  const prevSunday = new Date(
    Date.UTC(year, month - 1, day - weekdayIndex - 1),
  );

  return {
    start: toMidnightZurich(
      prevMonday.getUTCFullYear(),
      prevMonday.getUTCMonth() + 1,
      prevMonday.getUTCDate(),
    ),
    end: toEndOfDayZurich(
      prevSunday.getUTCFullYear(),
      prevSunday.getUTCMonth() + 1,
      prevSunday.getUTCDate(),
    ),
  };
};

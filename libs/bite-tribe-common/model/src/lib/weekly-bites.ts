import type { Bite } from './bite';

/**
 * One calendar week (Monday 00:00 to Sunday 23:59:59.999, Europe/Zurich) as
 * Unix-ms bounds. The weekly summary notification counts a week and carries its
 * bounds so the app can open exactly that week later on.
 */
export interface WeekRange {
  weekStart: number;
  weekEnd: number;
}

/** The bites of one week, together with the week they were resolved for. */
export interface WeeklyBites extends WeekRange {
  bites: Bite[];
}

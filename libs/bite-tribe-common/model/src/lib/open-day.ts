import type { DaySchedule, TimeRange } from './opening-hours';

const isComplete = (range: TimeRange): boolean => !!range.from && !!range.to;

/**
 * The hours a day is open, as guests are told them (GitHub issue #2227): the
 * complete ranges of a day marked open, and none for a closed day. A range
 * may cross midnight (22:00–02:00); it is shown as written.
 */
export const openTimeRangesOf = (day: DaySchedule): TimeRange[] =>
  day.isOpen ? (day.timeRanges ?? []).filter(isComplete) : [];

/**
 * Whether a day is open: marked open and with at least one complete range.
 * The one rule the business overview counts by and the consumer page shows,
 * so the two cannot disagree about a day (#2227).
 */
export const isOpenDay = (day: DaySchedule): boolean =>
  openTimeRangesOf(day).length > 0;

/**
 * A day the editor will not save: marked open with no time range, or with a
 * range missing its start or end.
 */
export const needsOpeningTimes = (day: DaySchedule): boolean =>
  day.isOpen &&
  (!(day.timeRanges ?? []).length || !(day.timeRanges ?? []).every(isComplete));

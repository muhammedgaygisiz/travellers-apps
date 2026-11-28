/**
 * A user's own named date range, such as "Southeast Asia 2026/2027".
 *
 * A trip stores no Bites. Its Bites are the owner's Bites whose
 * `createdAtTimestamp` falls inside {@link tripBiteRange}, so editing the dates
 * changes them and a Bite created later inside the range joins on its own.
 * Private to its owner. See `ssot/domain/trip.md` and epic #2351.
 */
export interface Trip {
  id: string;
  userId: string;
  title: string;
  /** First day of the trip, as `YYYY-MM-DD`. */
  startDate: string;
  /** Last day of the trip, as `YYYY-MM-DD`. Absent while the trip is ongoing. */
  endDate?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}

/** What the user enters for a trip, on create and on edit. */
export interface TripDraft {
  title: string;
  startDate: string;
  endDate?: string;
}

/** Mirrors the limit in `firestore.rules`, `match /trips/{tripId}`. */
export const TRIP_TITLE_MAX_LENGTH = 100;

const TRIP_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseTripDate = (
  value: string,
): { year: number; month: number; day: number } | undefined => {
  const match = TRIP_DATE_PATTERN.exec(value);

  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Rejects days that roll over, such as 2026-02-30.
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? { year, month, day }
    : undefined;
};

/** True for a real calendar day written as `YYYY-MM-DD`. */
export const isTripDate = (value: unknown): value is string =>
  typeof value === 'string' && parseTripDate(value) !== undefined;

/**
 * The `createdAtTimestamp` range a trip's Bites fall in: from the first
 * millisecond of the start date to the last millisecond of the end date, both
 * in the device's time zone. With no end date the range has no upper bound.
 *
 * Day ends are taken as the next day's start minus one, so a day shortened or
 * lengthened by a daylight-saving change is still covered whole.
 */
export const tripBiteRange = (
  trip: Pick<Trip, 'startDate' | 'endDate'>,
): { fromTimestamp: number; toTimestamp?: number } => {
  const start = parseTripDate(trip.startDate);

  if (!start) {
    throw new Error(`Invalid trip start date: ${trip.startDate}`);
  }

  const fromTimestamp = new Date(
    start.year,
    start.month - 1,
    start.day,
  ).getTime();

  if (!trip.endDate) {
    return { fromTimestamp };
  }

  const end = parseTripDate(trip.endDate);

  if (!end) {
    throw new Error(`Invalid trip end date: ${trip.endDate}`);
  }

  const toTimestamp =
    new Date(end.year, end.month - 1, end.day + 1).getTime() - 1;

  return { fromTimestamp, toTimestamp };
};

/** Today as a trip date, `YYYY-MM-DD`, in the device's time zone. */
export const tripDateOf = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

/**
 * A trip is ongoing once it has started and while it has not ended: its start
 * date is today or earlier, and it has no end date or one that is today or
 * later. A trip planned for later is not ongoing yet.
 */
export const isOngoingTrip = (
  trip: Pick<Trip, 'startDate' | 'endDate'>,
  today: string,
): boolean =>
  trip.startDate <= today && (!trip.endDate || trip.endDate >= today);

/** Why a draft cannot be saved, as the translation key that says so. */
export type TripDraftError =
  | 'trip-title-required'
  | 'trip-title-too-long'
  | 'trip-start-date-required'
  | 'trip-end-before-start';

/**
 * The first reason the draft would be refused, checked in the order the form
 * shows its fields; `undefined` when it can be saved. Mirrors the rules on
 * `/trips/{tripId}`, so the form refuses what the rules would refuse.
 */
export const tripDraftError = (
  draft: Partial<TripDraft>,
): TripDraftError | undefined => {
  const title = draft.title?.trim() ?? '';

  if (!title) {
    return 'trip-title-required';
  }

  if (title.length > TRIP_TITLE_MAX_LENGTH) {
    return 'trip-title-too-long';
  }

  if (!isTripDate(draft.startDate)) {
    return 'trip-start-date-required';
  }

  if (draft.endDate && draft.endDate < draft.startDate) {
    return 'trip-end-before-start';
  }

  return undefined;
};

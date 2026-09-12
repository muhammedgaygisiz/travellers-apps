/**
 * Whether a restaurant is open at a given instant, and when it next opens
 * (GitHub issue #1100).
 *
 * ## Why the backend owns this
 *
 * "The restaurant is currently accepting orders" is one of the six rules a
 * scanned QR code is validated against, and it is the only one whose answer
 * changes while nobody writes anything. A client that worked it out for itself
 * would be trusting a phone's clock and a phone's time zone to decide whether a
 * kitchen is taking orders, and the phone of a guest who has just landed is
 * frequently wrong about both.
 *
 * So this is not duplicated into the model library the way `table-state.ts` is.
 * There is no second copy to keep in step: the scan result carries `open` or a
 * `restaurantClosed` refusal, and the client renders what it is told.
 *
 * ## The time zone
 *
 * `Restaurant.openingHours` is a weekday and a pair of `HH:mm` strings and says
 * nothing about where in the world that is. Cloud Functions run in UTC, so
 * evaluating a schedule without a zone would close a Jakarta restaurant at four
 * in the afternoon. `TableOrderingSettings.timeZone` carries the IANA zone, and
 * every local field here - the weekday included - is read through
 * `Intl.DateTimeFormat` in that zone rather than off the server's own clock.
 *
 * ## What an unevaluable schedule does
 *
 * Nothing. A restaurant with no opening hours, or one whose stored zone is not
 * a zone, is treated as open rather than as closed. The restaurant turned table
 * ordering on deliberately and can pause it in one tap; refusing every scan
 * because a schedule was never filled in would take the feature away from the
 * restaurant over a field it does not know exists. The two switches that *are*
 * deliberate - `enabled` and the pause - keep working either way.
 */

export const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayName = (typeof DAY_NAMES)[number];

/** Minutes in a day, and the value `24:00` parses to. */
const MINUTES_PER_DAY = 1440;

/** A stored schedule says nothing about its own shape, so nothing is assumed. */
export interface StoredDaySchedule {
  day?: unknown;
  isOpen?: unknown;
  timeRanges?: unknown;
}

/** One range, reduced to minutes since local midnight. */
interface Range {
  from: number;
  to: number;
}

/** A day of the week as this module has to use it. */
interface Day {
  isOpen: boolean;
  ranges: Range[];
}

export interface ReopensAt {
  day: DayName;
  /** `HH:mm`, in the restaurant's own zone. */
  time: string;
}

export interface OpeningState {
  open: boolean;
  /** When the restaurant next opens. Absent while it is open. */
  reopensAt?: ReopensAt;
}

const TIME = /^(\d{1,2}):(\d{2})$/;

/**
 * `HH:mm` as minutes since midnight, or `undefined` for anything else.
 *
 * `24:00` is accepted and is the whole reason the parse is not a bare split: a
 * kitchen that serves until midnight writes `24:00`, and `00:00` in the `to`
 * field would read as a zero-length range and close the restaurant all day.
 */
export const parseTimeOfDay = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const match = TIME.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) {
    return undefined;
  }

  return hours * 60 + minutes;
};

/** `HH:mm` from minutes since midnight, zero-padded so `9:00` renders as `09:00`. */
const formatTimeOfDay = (minutes: number): string => {
  const clamped = minutes % MINUTES_PER_DAY;

  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(
    clamped % 60,
  ).padStart(2, '0')}`;
};

const parseRanges = (value: unknown): Range[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const range = entry as { from?: unknown; to?: unknown } | null;
    const from = parseTimeOfDay(range?.from);
    const to = parseTimeOfDay(range?.to);

    // A range that does not parse, and one whose ends are equal, are both
    // dropped. Equal ends are ambiguous - `00:00` to `00:00` reads as "all day"
    // to a person and as "no time at all" to arithmetic - and a day meant to be
    // open throughout says so with `isOpen` and no ranges.
    if (from === undefined || to === undefined || from === to) {
      return [];
    }

    return [{ from, to }];
  });
};

/** The schedule as a lookup by day, with everything unparseable dropped. */
const readSchedule = (schedule: unknown): Map<DayName, Day> => {
  const days = new Map<DayName, Day>();

  if (!Array.isArray(schedule)) {
    return days;
  }

  for (const entry of schedule as StoredDaySchedule[]) {
    const name = typeof entry?.day === 'string' ? entry.day.toLowerCase() : '';

    if (!(DAY_NAMES as readonly string[]).includes(name)) {
      continue;
    }

    days.set(name as DayName, {
      isOpen: entry?.isOpen === true,
      ranges: entry?.isOpen === true ? parseRanges(entry?.timeRanges) : [],
    });
  }

  return days;
};

/** The weekday and minute-of-day at `instant`, in `timeZone`. */
const localNow = (
  timeZone: string,
  instant: Date,
): { day: DayName; minutes: number } | undefined => {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      // `h23` rather than `hour12: false`, which renders midnight as `24` on
      // some ICU builds and would put the restaurant a whole day out.
      hourCycle: 'h23',
    }).formatToParts(instant);
  } catch {
    // `RangeError` for a zone the runtime does not know. An unevaluable
    // schedule is not a closed restaurant - see the note at the top.
    return undefined;
  }

  const valueOf = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const day = valueOf('weekday').toLowerCase();
  const hours = Number(valueOf('hour'));
  const minutes = Number(valueOf('minute'));

  if (
    !(DAY_NAMES as readonly string[]).includes(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return undefined;
  }

  return { day: day as DayName, minutes: hours * 60 + minutes };
};

const dayAt = (day: DayName, offset: number): DayName =>
  DAY_NAMES[(DAY_NAMES.indexOf(day) + offset + DAY_NAMES.length * 2) % 7];

/** Whether a range that starts on its own day is running at `minutes`. */
const coversSameDay = (range: Range, minutes: number): boolean =>
  range.from < range.to
    ? minutes >= range.from && minutes < range.to
    : minutes >= range.from;

/** Whether a range that started yesterday is still running at `minutes`. */
const coversFromYesterday = (range: Range, minutes: number): boolean =>
  range.from > range.to && minutes < range.to;

/**
 * The first opening on `day` strictly after `after` minutes, if any.
 *
 * `after` is `-1` for a whole day, so a range beginning at midnight counts.
 */
const nextStartOn = (
  day: Day | undefined,
  after: number,
): number | undefined => {
  if (!day?.isOpen) {
    return undefined;
  }

  // Open with no usable range means open throughout, so the day itself starts
  // at midnight. Only reachable for a *later* day: today with no range would
  // already have answered "open".
  if (!day.ranges.length) {
    return after < 0 ? 0 : undefined;
  }

  const starts = day.ranges
    .map((range) => range.from)
    .filter((start) => start > after)
    .sort((left, right) => left - right);

  return starts[0];
};

/**
 * Whether the restaurant is open at `instant`, and when it next opens.
 *
 * A range whose end is before its start runs past midnight, which is the case
 * this function exists for: a kitchen serving `22:00` to `02:00` on Friday is
 * open at one in the morning on Saturday, and a naive `from <= now < to` says
 * it is shut at every hour of both days. Saturday's own entry is not consulted
 * for that hour and does not have to be - the guest is inside Friday's service.
 */
export const evaluateOpeningHours = (
  schedule: unknown,
  timeZone: unknown,
  instant: Date,
): OpeningState => {
  const days = readSchedule(schedule);

  if (!days.size || typeof timeZone !== 'string' || !timeZone.trim()) {
    return { open: true };
  }

  const now = localNow(timeZone.trim(), instant);

  if (!now) {
    return { open: true };
  }

  const today = days.get(now.day);
  const yesterday = days.get(dayAt(now.day, -1));

  const openNow =
    (today?.isOpen === true &&
      (!today.ranges.length ||
        today.ranges.some((range) => coversSameDay(range, now.minutes)))) ||
    (yesterday?.ranges ?? []).some((range) =>
      coversFromYesterday(range, now.minutes),
    );

  if (openNow) {
    return { open: true };
  }

  for (let offset = 0; offset <= 7; offset++) {
    const day = dayAt(now.day, offset);
    const start = nextStartOn(days.get(day), offset === 0 ? now.minutes : -1);

    if (start !== undefined) {
      return {
        open: false,
        reopensAt: { day, time: formatTimeOfDay(start) },
      };
    }
  }

  // A schedule with every day closed. Nothing to promise the guest.
  return { open: false };
};

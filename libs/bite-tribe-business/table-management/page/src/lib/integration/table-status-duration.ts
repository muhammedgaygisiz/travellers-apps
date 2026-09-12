/**
 * How long a table has been doing what it is doing (GitHub issue #1093).
 *
 * ## Why this is not a date pipe
 *
 * A host scanning a room is asking "how long", not "since when". `19:42` makes
 * them subtract; `22 min` is the answer. The number is also the one thing on
 * the plan that changes without anybody touching the database, so it is
 * computed from a clock the view ticks rather than stored anywhere.
 *
 * ## Why it returns a key and not a string
 *
 * Formatting a duration is translation, and this library must not hold English.
 * The parts below choose *which* sentence, and Transloco fills it in - which is
 * also what lets a language that says "22 minutes" where English says "22 min"
 * do so without a branch here.
 */

/** Milliseconds in the units a service is measured in. */
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** The sentence a duration is said with, and the numbers that go in it. */
export interface ElapsedParts {
  /** The Transloco key. */
  key: string;
  params: { hours: number; minutes: number };
}

/**
 * The elapsed time between two epoch milliseconds, as a sentence to translate.
 *
 * Rounded **down** to the minute, and a table that entered its status less than
 * a minute ago reads "just now" rather than "0 min". Down rather than to the
 * nearest, because the number is read as a claim about the past: a table seated
 * forty seconds ago saying `1 min` is wrong in the direction that matters,
 * since the whole point of the field is spotting the table that has been
 * waiting too long.
 *
 * A `since` in the future - two devices whose clocks disagree, or a transition
 * stamped by a backend a second ahead - reads as "just now" rather than as a
 * negative duration. The backend of issue #1092 stamps `since`, so a
 * disagreement is small and momentary, and clamping is the only answer that is
 * never nonsense on screen.
 */
export const elapsedParts = (since: number, now: number): ElapsedParts => {
  const elapsed = Math.max(0, now - since);

  if (elapsed < MINUTE_MS) {
    return {
      key: 'table-status-elapsed-now',
      params: { hours: 0, minutes: 0 },
    };
  }

  const hours = Math.floor(elapsed / HOUR_MS);
  const minutes = Math.floor((elapsed % HOUR_MS) / MINUTE_MS);

  return hours === 0
    ? { key: 'table-status-elapsed-minutes', params: { hours, minutes } }
    : { key: 'table-status-elapsed-hours', params: { hours, minutes } };
};

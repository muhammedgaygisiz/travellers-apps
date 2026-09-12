import { elapsedParts } from '../table-status-duration';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = 1_760_000_000_000;

describe('elapsedParts', () => {
  it('says "just now" under a minute', () => {
    expect(elapsedParts(NOW - 59_999, NOW).key).toBe(
      'table-status-elapsed-now',
    );
  });

  it('counts whole minutes under an hour', () => {
    expect(elapsedParts(NOW - 22 * MINUTE, NOW)).toEqual({
      key: 'table-status-elapsed-minutes',
      params: { hours: 0, minutes: 22 },
    });
  });

  it('splits an hour off once there is one', () => {
    expect(elapsedParts(NOW - (2 * HOUR + 7 * MINUTE), NOW)).toEqual({
      key: 'table-status-elapsed-hours',
      params: { hours: 2, minutes: 7 },
    });
  });

  /**
   * Down rather than to the nearest: the number is read as a claim about the
   * past, and a table seated forty seconds ago that says `1 min` is wrong in
   * the direction the field exists to get right.
   */
  it('rounds down rather than to the nearest minute', () => {
    expect(elapsedParts(NOW - (4 * MINUTE + 59_000), NOW).params.minutes).toBe(
      4,
    );
  });

  /**
   * Two devices whose clocks disagree, or a transition stamped a second ahead.
   * Clamping is the only answer that is never nonsense on screen.
   */
  it('reads a future timestamp as just now', () => {
    expect(elapsedParts(NOW + 5 * MINUTE, NOW).key).toBe(
      'table-status-elapsed-now',
    );
  });

  it('reports the exact hour with no stray minutes', () => {
    expect(elapsedParts(NOW - HOUR, NOW)).toEqual({
      key: 'table-status-elapsed-hours',
      params: { hours: 1, minutes: 0 },
    });
  });
});

import { tableTransitionFailure } from '../table-transition-failure';

/**
 * Which sentence a refused transition is owed (GitHub issue #1094).
 *
 * The code is the primary signal and the message is the fallback, because the
 * shape an error arrives in differs by platform: the web SDK gives
 * `functions/aborted`, and a native rejection can arrive with the code folded
 * into the message instead.
 */
describe('tableTransitionFailure', () => {
  it.each([
    ['functions/aborted', 'conflict'],
    ['aborted', 'conflict'],
    ['functions/failed-precondition', 'not-allowed'],
    ['functions/permission-denied', 'permission'],
    ['functions/unauthenticated', 'permission'],
    ['functions/internal', 'unknown'],
  ])('reads %s as %s', (code, expected) => {
    expect(tableTransitionFailure({ code, message: '' })).toBe(expected);
  });

  /**
   * The backend's own wording, for a platform that dropped the code. It is
   * stable and distinctive enough to be a substring rather than a parse.
   */
  it('reads a conflict out of the message when there is no code', () => {
    expect(
      tableTransitionFailure(
        new Error('The table is occupied now. Someone else changed it first.'),
      ),
    ).toBe('conflict');
  });

  /**
   * A table the owner took out of service is refused as a precondition, and
   * the copy for that case covers both it and a move the matrix does not hold.
   */
  it('reads a table out of service as something it cannot do', () => {
    expect(
      tableTransitionFailure({
        code: 'functions/failed-precondition',
        message: 'Table 12 is not in service, so no party can be seated at it.',
      }),
    ).toBe('not-allowed');
  });

  /** A rejection carrying nothing to read is the one nobody can explain. */
  it.each([[undefined], [null], ['something went wrong'], [{}]])(
    'falls back to unknown for %p',
    (error) => {
      expect(tableTransitionFailure(error)).toBe('unknown');
    },
  );

  /**
   * The failures that mean "not yet" rather than "no" (GitHub issue #1096).
   *
   * These are the ones the queue keeps instead of reporting: the call never
   * reached the backend, so nothing was decided and sending it again is the
   * right move. Every SDK in the stack says it differently, which is why the
   * codes and the wording are both read.
   */
  it.each([
    [{ code: 'functions/unavailable', message: 'Service unavailable' }],
    [{ code: 'functions/deadline-exceeded', message: 'Deadline exceeded' }],
    [new Error('Failed to fetch')],
    [new Error('The Internet connection appears to be offline.')],
    [{ code: '', message: 'Network error' }],
  ])('reads %p as a call that never left the device', (error) => {
    expect(tableTransitionFailure(error)).toBe('offline');
  });

  /**
   * The unsettled bill is a **question**, not a refusal (GitHub issue #1111).
   * Reading it as `not-allowed` would tell a host standing next to the table
   * to give up on a bill they can still record.
   */
  it('reads an unsettled bill as its own answer, not as not-allowed', () => {
    expect(
      tableTransitionFailure({
        code: 'functions/failed-precondition',
        message:
          'The bill for table 12 has not been recorded as paid. Confirm that the visit should be closed unsettled.',
      }),
    ).toBe('unsettled-bill');
  });

  /** Every other `failed-precondition` still is one. */
  it('keeps an ordinary precondition failure as not-allowed', () => {
    expect(
      tableTransitionFailure({
        code: 'functions/failed-precondition',
        message: 'Table 12 is not in service, so no party can be seated at it.',
      }),
    ).toBe('not-allowed');
  });

  /**
   * A definite answer is never mistaken for a dropped connection, however its
   * message is worded. The offline check runs last for exactly this case.
   */
  it('keeps a refusal a refusal even when it mentions the network', () => {
    expect(
      tableTransitionFailure({
        code: 'functions/permission-denied',
        message: 'You do not work at this restaurant. Check your network.',
      }),
    ).toBe('permission');
  });
});

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

  /** A request that never left the device has no code and no message. */
  it.each([[undefined], [null], ['offline'], [{}]])(
    'falls back to unknown for %p',
    (error) => {
      expect(tableTransitionFailure(error)).toBe('unknown');
    },
  );
});

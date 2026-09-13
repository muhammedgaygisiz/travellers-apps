import { tableOrderFailure } from '../table-order-failure';

/**
 * Which sentence a failed order transition is owed (GitHub issue #1105).
 *
 * Both shapes an error arrives in are covered, because the shape differs by
 * platform: the web SDK gives `functions/aborted` and a native rejection can
 * arrive with the code folded into the message instead. A mapping that only
 * knew the first would leave a staff member on a tablet reading "we couldn't
 * change this order" when what happened was a colleague getting there first.
 */
describe(tableOrderFailure.name, () => {
  it.each([
    ['functions/aborted', 'conflict'],
    ['functions/not-found', 'not-found'],
    ['functions/failed-precondition', 'not-allowed'],
    ['functions/invalid-argument', 'not-allowed'],
    ['functions/permission-denied', 'permission'],
    ['functions/unauthenticated', 'permission'],
    ['functions/internal', 'unknown'],
  ])('reads %s as %s', (code, expected) => {
    expect(tableOrderFailure({ code })).toBe(expected);
  });

  it('reads the backend wording when the code did not survive the bridge', () => {
    expect(
      tableOrderFailure({
        message:
          'The order is accepted now, not submitted. Someone else changed it first.',
      }),
    ).toBe('conflict');
  });

  /**
   * Ahead of the generic `invalid-argument`, because a missing reason is the
   * one malformed request staff can actually do something about - and the queue
   * refuses to send one, so reaching it at all means a screen got it wrong.
   */
  it('separates a reasonless cancellation from every other bad argument', () => {
    expect(
      tableOrderFailure({
        code: 'functions/invalid-argument',
        message: 'A cancellation needs a reason the guest can be shown.',
      }),
    ).toBe('reason-required');
  });

  it('falls back to unknown for anything it cannot read', () => {
    expect(tableOrderFailure(undefined)).toBe('unknown');
    expect(tableOrderFailure('something went wrong')).toBe('unknown');
    expect(tableOrderFailure(new Error('boom'))).toBe('unknown');
  });
});

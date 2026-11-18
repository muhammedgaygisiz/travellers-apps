import { getDisplayNameFailureReason } from '../display-name-error-reason';

describe(getDisplayNameFailureReason.name, () => {
  it.each([
    [{ code: 'already-exists', message: 'display_name_taken' }, 'taken'],
    [{ code: 'invalid-argument', message: 'invalid_display_name' }, 'invalid'],
    // Issue #1610: the name failed the content check.
    [{ code: 'invalid-argument', message: 'display_name_refused' }, 'refused'],
    [new Error('network'), 'unknown'],
    [undefined, 'unknown'],
  ])('reads %p as %s', (error, reason) => {
    expect(getDisplayNameFailureReason(error)).toBe(reason);
  });
});

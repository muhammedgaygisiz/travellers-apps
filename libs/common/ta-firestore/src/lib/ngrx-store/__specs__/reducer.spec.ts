import { AuthActions } from '../actions';
import { AuthResult } from '../auth-result.model';
import { reducer } from '../reducer';

const initialState = (): AuthResult =>
  reducer(undefined, { type: '@@init' } as never);

const pendingState = (): AuthResult =>
  reducer(
    initialState(),
    AuthActions.login({ authCreds: { email: '', password: '' } }),
  );

describe('auth reducer', () => {
  it('should start with no sign-in in flight', () => {
    expect(initialState().authenticationPending).toBe(false);
  });

  // Issue #1273: the login form reads this flag to acknowledge the tap and to
  // block a second one, so every entry point has to raise it.
  it.each([
    ['login', AuthActions.login({ authCreds: { email: '', password: '' } })],
    ['google sign-in', AuthActions.loginWithGoogleAccount()],
    ['apple sign-in', AuthActions.loginWithAppleAccount()],
  ])('should mark a sign-in pending on %s', (_, action) => {
    expect(reducer(initialState(), action).authenticationPending).toBe(true);
  });

  it('should clear a previous failure when a new sign-in starts', () => {
    const failed = reducer(initialState(), AuthActions.loginFailed());

    const retried = reducer(
      failed,
      AuthActions.login({ authCreds: { email: '', password: '' } }),
    );

    expect(retried.authenticationFailed).toBe(false);
    expect(retried.authenticationPending).toBe(true);
  });

  it('should release the pending state on success', () => {
    const state = reducer(pendingState(), AuthActions.loginSucceeded());

    expect(state.authenticationPending).toBe(false);
    expect(state.authenticated).toBe(true);
  });

  it('should release the pending state on failure and surface it', () => {
    const state = reducer(pendingState(), AuthActions.loginFailed());

    expect(state.authenticationPending).toBe(false);
    expect(state.authenticationFailed).toBe(true);
  });

  // The Google and Apple effects report their failure as a registration
  // failure, including a dismissed native sheet.
  it('should release the pending state when a provider sign-in reports a failure', () => {
    const state = reducer(
      pendingState(),
      AuthActions.registrationFailed({ code: 'auth/cancelled' }),
    );

    expect(state.authenticationPending).toBe(false);
  });

  it('should release the pending state on logout', () => {
    const state = reducer(pendingState(), AuthActions.logoutSucceeded());

    expect(state.authenticationPending).toBe(false);
  });
});

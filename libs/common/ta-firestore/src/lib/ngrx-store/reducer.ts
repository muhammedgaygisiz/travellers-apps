import { Action, createReducer, on } from '@ngrx/store';
import { AuthActions } from './actions';
import { AuthResult } from './auth-result.model';

const INITIAL_STATE: AuthResult = {
  user: undefined,
  authenticated: false,
  authenticationFailed: false,
  authenticationPending: false,
  errorCode: null,
};

export const reducer = createReducer<AuthResult, Action>(
  INITIAL_STATE,
  // Every sign-in entry point raises the pending flag, and every outcome lowers
  // it again, so the login form can acknowledge the tap and block a second one
  // for exactly as long as the round-trip runs (issue #1273).
  on(
    AuthActions.login,
    AuthActions.loginWithGoogleAccount,
    AuthActions.loginWithAppleAccount,
    (state) => ({
      ...state,
      authenticationPending: true,
      authenticationFailed: false,
    }),
  ),
  on(AuthActions.loginSucceeded, (state) => ({
    ...state,
    authenticationFailed: false,
    authenticationPending: false,
    authenticated: true,
  })),
  on(AuthActions.loadedUser, (state, { user }) => ({
    ...state,
    user,
  })),
  on(AuthActions.loginFailed, (state) => ({
    ...state,
    authenticationFailed: true,
    authenticationPending: false,
    authenticated: false,
  })),
  // The Google and Apple effects report their failure as a registration
  // failure. What that surfaces is left as it is; it only has to release the
  // form it locked, including when the user simply dismissed the native sheet.
  on(AuthActions.registrationFailed, (state) => ({
    ...state,
    authenticationPending: false,
  })),
  on(AuthActions.logoutSucceeded, () => ({
    authenticated: false,
    authenticationFailed: false,
    authenticationPending: false,
    errorCode: null,
    user: undefined,
  })),
);

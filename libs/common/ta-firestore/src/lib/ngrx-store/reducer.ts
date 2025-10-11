import { Action, createReducer, on } from '@ngrx/store';
import { AuthActions } from './actions';
import { AuthResult } from './auth-result.model';

export const reducer = createReducer<AuthResult, Action>(
  {
    authenticated: false,
    authenticationFailed: false,
    errorCode: null,
  },
  on(AuthActions.loginSucceeded, (state) => ({
    ...state,
    authenticationFailed: false,
    authenticated: true,
  })),
  on(AuthActions.loadedUser, (state, { user }) => ({
    ...state,
    user,
  })),
  on(AuthActions.loginFailed, (state) => ({
    ...state,
    authenticationFailed: true,
    authenticated: false,
  })),
  on(AuthActions.registrationFailed, (state, { code }) => ({
    ...state,
    registrationFailed: true,
    errorCode: code,
  })),
  on(AuthActions.confirmRegistrationErrorMessage, (state) => ({
    ...state,
    registrationFailed: false,
    errorCode: null,
  })),
  on(AuthActions.logoutSucceeded, () => ({
    authenticated: false,
    authenticationFailed: false,
    errorCode: null,
  })),
);

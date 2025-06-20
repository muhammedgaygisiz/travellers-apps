import { Action, createReducer, on } from '@ngrx/store';
import {
  confirmRegistrationErrorMessage,
  loadedUser,
  loginFailed,
  loginSucceeded,
  logoutSucceeded,
  notAuthenticated,
  registrationFailed,
} from './actions';
import { AuthResult } from './auth-result.model';

export const reducer = createReducer<AuthResult, Action>(
  {
    authenticated: false,
    authenticationFailed: false,
    errorCode: null,
  },
  on(loginSucceeded, (state) => ({
    ...state,
    authenticationFailed: false,
    authenticated: true,
  })),
  on(loadedUser, (state, { user }) => ({
    ...state,
    user,
  })),
  on(notAuthenticated, (state) => ({
    ...state,
    authenticationFailed: false,
    authenticated: false,
  })),
  on(loginFailed, (state) => ({
    ...state,
    authenticationFailed: true,
    authenticated: false,
  })),
  on(registrationFailed, (state, { code }) => ({
    ...state,
    registrationFailed: true,
    errorCode: code,
  })),
  on(confirmRegistrationErrorMessage, (state) => ({
    ...state,
    registrationFailed: false,
    errorCode: null,
  })),
  on(logoutSucceeded, () => ({
    authenticated: false,
    authenticationFailed: false,
    errorCode: null,
  }))
);

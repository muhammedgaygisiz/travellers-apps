import { Action, createReducer, on } from '@ngrx/store';
import { loginFailed, loginSucceeded, notAuthenticated } from './actions';

export interface AuthResult {
  authenticated: boolean;
  authenticationFailed: boolean;
}

export const reducer = createReducer<AuthResult, Action>(
  {
    authenticated: false,
    authenticationFailed: false,
  },
  on(loginSucceeded, (state) => ({
    ...state,
    authenticationFailed: false,
    authenticated: true,
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
  }))
);

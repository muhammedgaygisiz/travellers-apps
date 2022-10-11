import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { AuthResult } from './reducer';

const authState = createFeatureSelector<AuthResult>(key);

export const selectIsAuthenticated = createSelector(
  authState,
  (authState) => authState.authenticated
);

export const selectLoginFailed = createSelector(
  authState,
  (authState) => authState.authenticationFailed
);

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';

const authState = createFeatureSelector<boolean>(key);

export const selectIsAuthenticated = createSelector(
  authState,
  (isAuthenticated) => isAuthenticated
);

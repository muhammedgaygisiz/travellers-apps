import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';

const networkState = createFeatureSelector<boolean>(key);

export const selectIsOnline = createSelector(
  networkState,
  (isOnline) => isOnline
);

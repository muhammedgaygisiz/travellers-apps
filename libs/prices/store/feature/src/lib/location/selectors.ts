import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';

const locationState = createFeatureSelector<string>(key);

export const selectLocation = createSelector(
  locationState,
  (location) => location
);

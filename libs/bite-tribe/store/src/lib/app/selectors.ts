import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';

const slice = createFeatureSelector<{ position: any }>(key);

export const gpsPosition = createSelector(slice, (slice) => slice.position);

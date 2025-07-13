import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { AppSlice } from './app-slice.model';

const slice = createFeatureSelector<AppSlice>(key);

export const gpsPosition = createSelector(slice, (slice) => slice?.position);
export const settings = createSelector(slice, (slice) => slice?.settings);
export const isPublicProfile = createSelector(
  slice,
  (slice) => slice?.profile?.public
);
export const currency = createSelector(slice, (slice) => {
  return slice?.settings?.currency;
});

export const isBitesLoading = createSelector(slice, (slice) => {
  return slice?.loading?.home;
});

export const publicUser = createSelector(slice, (slice) => slice?.profile);

export const homeFilters = createSelector(
  slice,
  (slice) => slice?.homeFilters || []
);

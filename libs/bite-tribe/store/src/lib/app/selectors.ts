import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { AppSlice } from './app-slice.model';

const slice = createFeatureSelector<AppSlice>(key);

export const gpsPosition = createSelector(slice, (slice) => slice?.position);
export const settings = createSelector(slice, (slice) => slice?.settings);
export const isPublicProfile = createSelector(
  slice,
  (slice) => slice?.profile?.public,
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
  (slice) => slice?.homeFilters?.map((filter) => filter.toLowerCase()) || [],
);

export const homeMaxPriceFilter = createSelector(
  slice,
  (slice) => slice?.maxPriceFilter || 0,
);

export const homeDistance = createSelector(
  slice,
  (slice) => slice?.homeDistance,
);

export const exchangeRates = createSelector(
  slice,
  (slice) => slice?.exchangeRates,
);

export const preferredCurrency = createSelector(
  settings,
  (settings) => settings?.currency || 'EUR',
);

export const maxPriceHome = createSelector(slice, (slice) => {
  return slice?.maxPriceFilter || 0;
});

export const homeSorting = createSelector(slice, (slice) => {
  return slice?.homeSorting || 'distance';
});

export const isDarkTheme = createSelector(slice, (slice) => {
  return slice?.settings.theme === 'dark';
});

export const isReloadingHome = createSelector(
  slice,
  (state) => !!state?.reloading?.home,
);

export const hasErrorLoadingGpsPosition = createSelector(
  slice,
  (state) => state?.errorLoadingGpsPosition,
);

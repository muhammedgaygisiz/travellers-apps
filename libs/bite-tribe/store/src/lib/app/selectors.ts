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

export const favCurrencies = createSelector(
  settings,
  (settings) => settings?.favoriteCurrencies || [],
);

export const isBitesLoading = createSelector(slice, (slice) => {
  return slice?.loading?.home;
});

export const publicUser = createSelector(slice, (slice) => slice?.profile);

export const exchangeRates = createSelector(
  slice,
  (slice) => slice?.exchangeRates,
);

export const preferredCurrency = createSelector(
  settings,
  (settings) => settings?.currency || 'EUR',
);

export const isReloadingHome = createSelector(
  slice,
  (state) => !!state?.reloading?.home,
);

export const hasErrorLoadingGpsPosition = createSelector(
  slice,
  (state) => state?.errorLoadingGpsPosition,
);

export const hasErrorLoadingBites = createSelector(
  slice,
  (state) => !!state?.errorLoadingBites,
);

export const locationPermissionState = createSelector(
  slice,
  (state) => state?.locationPermissionState,
);

export const profileMetadata = createSelector(
  slice,
  (state) => state?.profileMetadata,
);

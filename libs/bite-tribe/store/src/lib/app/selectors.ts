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
  (slice) =>
    slice?.sortingAndFiltering?.filtering?.home?.filters?.map((filter) =>
      filter.toLowerCase(),
    ) || [],
);

export const homeMaxPriceFilter = createSelector(
  slice,
  (slice) => slice?.sortingAndFiltering?.filtering?.home?.maxPrice || 0,
);

export const homeDistance = createSelector(
  slice,
  (slice) => slice?.sortingAndFiltering?.filtering?.home?.distance,
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
  return slice?.sortingAndFiltering?.filtering?.home?.maxPrice || 0;
});

export const homeSorting = createSelector(slice, (slice) => {
  return slice?.sortingAndFiltering?.sorting?.home || 'distance';
});

export const myBitesSorting = createSelector(slice, (slice) => {
  return slice?.sortingAndFiltering?.sorting?.myBites || 'distance';
});

export const bucketlistSorting = createSelector(slice, (slice) => {
  return slice?.sortingAndFiltering?.sorting?.bucketlists || 'name';
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

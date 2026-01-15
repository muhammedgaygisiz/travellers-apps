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

export const followerCount = createSelector(slice, (slice) => {
  return slice.followedBy?.length || 0;
});

export const followingCount = createSelector(slice, (slice) => {
  return slice.profile?.followers?.length || 0;
});

export const exchangeRates = createSelector(
  slice,
  (slice) => slice?.exchangeRates,
);

export const preferredCurrency = createSelector(
  settings,
  (settings) => settings?.currency || 'EUR',
);

export const isDarkTheme = createSelector(slice, (slice) => {
  return slice?.settings?.theme === 'dark';
});

export const isReloadingHome = createSelector(
  slice,
  (state) => !!state?.reloading?.home,
);

export const hasErrorLoadingGpsPosition = createSelector(
  slice,
  (state) => state?.errorLoadingGpsPosition,
);

export const userHasSubscriptionTierOne = createSelector(slice, (state) => {
  if (state?.profile?.subscriptionTier) {
    return state.profile.subscriptionTier >= 1;
  }
  return false;
});

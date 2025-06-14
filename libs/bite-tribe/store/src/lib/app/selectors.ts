import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { Settings } from 'model';

const slice = createFeatureSelector<{
  position: any;
  settings: Settings;
  isPublicProfile: boolean;
}>(key);

export const gpsPosition = createSelector(slice, (slice) => slice?.position);
export const settings = createSelector(slice, (slice) => slice?.settings);
export const isPublicProfile = createSelector(
  slice,
  (slice) => slice?.isPublicProfile
);
export const currency = createSelector(slice, (slice) => {
  return slice?.settings?.currency;
});

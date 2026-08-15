import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FilteringAndSortingSlice } from './filtering-and-sorting-slice.model';
import { key } from './key';

export const slice = createFeatureSelector<FilteringAndSortingSlice>(key);

export const homeFilters = createSelector(
  slice,
  (slice) =>
    slice?.filtering?.home?.filters?.map((filter) => filter.toLowerCase()) ||
    [],
);

export const homeDistance = createSelector(
  slice,
  (slice) => slice?.filtering?.home?.distance,
);

export const myBitesDistance = createSelector(
  slice,
  (slice) => slice?.filtering?.mybites?.distance,
);

export const homeMaxPriceFilter = createSelector(
  slice,
  (slice) => slice?.filtering?.home?.maxPrice || 0,
);

export const homeSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.home || 'distance';
});

export const myBitesFilters = createSelector(
  slice,
  (slice) =>
    slice?.filtering?.mybites?.filters?.map((filter) => filter.toLowerCase()) ||
    [],
);

export const myBitesMaxPriceFilter = createSelector(
  slice,
  (slice) => slice?.filtering?.mybites?.maxPrice || 0,
);

export const myBitesSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.myBites || 'distance';
});

export const restaurantBitesSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.restaurantBites || 'createdAt';
});

export const weeklyBitesSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.weeklyBites || 'createdAt';
});

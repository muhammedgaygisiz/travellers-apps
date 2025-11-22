import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FilteringAndSortingSlice } from './filtering-and-sorting-slice.model';
import { key } from './key';

const slice = createFeatureSelector<FilteringAndSortingSlice>(key);

export const homeFilters = createSelector(
  slice,
  (slice) =>
    slice?.filtering?.home?.filters?.map((filter) => filter.toLowerCase()) ||
    [],
);

export const homeMaxPriceFilter = createSelector(
  slice,
  (slice) => slice?.filtering?.home?.maxPrice || 0,
);

export const homeDistance = createSelector(
  slice,
  (slice) => slice?.filtering?.home?.distance,
);

export const maxPriceHome = createSelector(slice, (slice) => {
  return slice?.filtering?.home?.maxPrice || 0;
});

export const homeSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.home || 'distance';
});

export const myBitesSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.myBites || 'distance';
});

export const bucketlistSorting = createSelector(slice, (slice) => {
  return slice?.sorting?.bucketlists || 'name';
});

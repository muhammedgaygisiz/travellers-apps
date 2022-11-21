import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { SiteState } from './model';

const siteState = createFeatureSelector<SiteState>(key);

export const selectIsProjectBarOpen = createSelector(
  siteState,
  (state) => state.isProjectBarOpen
);

export const selectProjectStructure = createSelector(
  siteState,
  (state) => state.projectStructure
);

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { SiteState } from './model';

const siteState = createFeatureSelector<SiteState>(key);

export const selectProjectStructure = createSelector(
  siteState,
  (state) => state.projectStructure
);

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';

const slice = createFeatureSelector<EntityState<any>>(key);

const { selectAll } = adapter.getSelectors();

export const bites = createSelector(slice, selectAll);

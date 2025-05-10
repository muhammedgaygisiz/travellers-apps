import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import { adapter } from './adapter';

const slice = createFeatureSelector<EntityState<any>>(key);

const { selectAll } = adapter.getSelectors();

export const likes = createSelector(slice, selectAll);

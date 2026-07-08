import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import type { Like } from 'model';
import { adapter } from './adapter';

const slice = createFeatureSelector<EntityState<Like>>(key);

const { selectAll } = adapter.getSelectors();

export const likes = createSelector(slice, selectAll);

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Review } from 'model';

const slice = createFeatureSelector<EntityState<Review>>(key);

const { selectAll } = adapter.getSelectors();

export const reviews = createSelector(slice, selectAll);

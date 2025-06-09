import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bucketlist } from 'model';

const slice = createFeatureSelector<EntityState<Bucketlist>>(key);

const { selectAll } = adapter.getSelectors();

export const bucketlists = createSelector(slice, selectAll);

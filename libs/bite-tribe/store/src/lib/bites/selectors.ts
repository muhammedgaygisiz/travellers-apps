import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bite } from 'model';
import { biteId } from '../router/selectors';

const slice = createFeatureSelector<EntityState<Bite>>(key);

const { selectAll } = adapter.getSelectors();

export const bites = createSelector(slice, selectAll);

export const bite = createSelector(biteId, bites, (id, bites) =>
  bites.find((bite) => bite.id === id)
);

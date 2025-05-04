import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { selectRouteParams } from '../router/selectors';
import { Bite } from 'model';

const slice = createFeatureSelector<EntityState<Bite>>(key);

const { selectAll } = adapter.getSelectors();

export const bites = createSelector(slice, selectAll);

const biteId = createSelector(selectRouteParams, ({ id }) => id);

export const bite = createSelector(biteId, bites, (id, bites) =>
  bites.find((bite) => bite.id === id)
);

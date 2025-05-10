import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bite } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';

const slice = createFeatureSelector<EntityState<Bite>>(key);

const { selectAll } = adapter.getSelectors();

const allBites = createSelector(slice, selectAll);

export const bites = createSelector(allBites, likes, (bites, likes) => {
  return bites.map((bite) => {
    return {
      ...bite,
      likes: likes.filter((like) => bite.id === like.biteId) || [],
    } as Bite;
  });
});

export const bite = createSelector(biteId, bites, (id, bites) =>
  bites.find((bite) => bite.id === id)
);

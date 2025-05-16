import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedLikesFromApi, deletedLike } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedLikesFromApi, (state, { likes }) => {
    return adapter.upsertMany(likes, state);
  }),
  on(deletedLike, (state, { like }) => {
    return adapter.removeOne(`${like.biteId}-${like.userId}`, state);
  })
);

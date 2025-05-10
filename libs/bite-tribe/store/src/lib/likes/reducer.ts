import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedLikesFromApi } from './actions';
import { deletedLike } from '../bites/actions';

export const reducer = createReducer(
  initialState,
  on(loadedLikesFromApi, (state, { likes }) => {
    return adapter.upsertMany(likes, state);
  }),
  on(deletedLike, (state, { like }) => {
    return adapter.removeOne(`${like.biteId}-${like.userId}`, state);
  })
);

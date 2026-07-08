import { createReducer, on } from '@ngrx/store';
import { adapter, initialState, likeId } from './adapter';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  removeLikeFailed,
  saveLike,
  saveLikeFailed,
} from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedLikesFromApi, (state, { likes }) => {
    return adapter.upsertMany(likes, state);
  }),
  on(saveLike, (state, { like }) => {
    return adapter.upsertOne(like, state);
  }),
  on(saveLikeFailed, (state, { like, previousLikeType }) => {
    if (previousLikeType) {
      return adapter.upsertOne({ ...like, likeType: previousLikeType }, state);
    }

    return adapter.removeOne(likeId(like), state);
  }),
  on(removeLike, (state, { like }) => {
    return adapter.removeOne(likeId(like), state);
  }),
  on(removeLikeFailed, (state, { like }) => {
    return adapter.upsertOne(like, state);
  }),
  on(deletedLike, (state, { like }) => {
    return adapter.removeOne(likeId(like), state);
  }),
);

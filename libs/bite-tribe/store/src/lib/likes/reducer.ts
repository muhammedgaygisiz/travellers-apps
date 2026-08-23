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
import type { Like } from 'model';

/**
 * Whether the store already holds this like in exactly this state.
 *
 * `upsertMany` rebuilds the entity object for every id it is handed, changed or
 * not, so re-seeding unchanged likes still produced a fresh `likes` array. That
 * array feeds the Bite feed selectors, which rebuild every Bite with a new
 * identity and re-render the whole feed. Seeding runs on navigation into a
 * Bite, which is how a dense feed lost seconds of main thread to a load that
 * changed nothing. See GitHub issue #1357.
 */
const isUnchanged = (existing: Like | undefined, like: Like): boolean =>
  !!existing &&
  existing.likeType === like.likeType &&
  existing.createdAt === like.createdAt &&
  existing.userId === like.userId &&
  existing.biteId === like.biteId;

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedLikesFromApi, (state, { likes }) => {
    const hasChanges = likes.some(
      (like) => !isUnchanged(state.entities[likeId(like)], like),
    );

    return hasChanges ? adapter.upsertMany(likes, state) : state;
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

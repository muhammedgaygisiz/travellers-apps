import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { BiteActions } from './actions';
import {
  removeLike,
  removeLikeFailed,
  saveLike,
  saveLikeFailed,
} from '../likes/actions';
import {
  adjustBiteLikeCounts,
  LikeCountDeltas,
} from './utils/adjust-bite-like-counts';
import { fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';
import type { LikeType } from 'model';

const saveLikeDeltas = (
  likeType: LikeType,
  previousLikeType: LikeType | undefined,
  direction: 1 | -1,
): LikeCountDeltas => ({
  [likeType]: direction,
  ...(previousLikeType && previousLikeType !== likeType
    ? { [previousLikeType]: -direction }
    : {}),
});

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(BiteActions.loadedByGPSPositionFromAPI, (state, { bites }) => ({
    ...state,
    ...adapter.upsertMany(bites, state),
  })),
  on(BiteActions.deletedBite, (state, { bite }) => ({
    ...state,
    ...adapter.removeOne(bite.id, state),
    bitesByUserId: state.bitesByUserId.filter((b) => b.id !== bite.id),
    latestBites: state.latestBites.filter((b) => b.id !== bite.id),
    bitesByBucketlist: state.bitesByBucketlist.filter((b) => b.id !== bite.id),
  })),
  on(BiteActions.cacheBite, (state, { bite }) => ({
    ...state,
    cachedBite: bite,
  })),
  on(BiteActions.clearCachedBite, (state) => ({
    ...state,
    cachedBite: undefined,
  })),
  on(BiteActions.setEditingBite, (state, { bite }) => ({
    ...state,
    editingBite: bite,
  })),
  on(BiteActions.saveNewBite, (state) => ({
    ...state,
    cachedBite: undefined,
  })),
  on(BiteActions.savedBite, BiteActions.createdBite, (state, { bite }) => {
    const stateWithResetCachedBite = {
      ...state,
      editingBite: undefined,
    };

    return adapter.upsertOne(bite, stateWithResetCachedBite);
  }),
  on(routerNavigatedAction, (state, { payload }) => {
    if (payload.event.url.includes(PATH.HOME)) {
      return {
        ...state,
        biteCreator: undefined,
      };
    }

    return state;
  }),
  on(BiteActions.noPublicCreatorForBite, (state) => ({
    ...state,
    biteCreator: undefined,
  })),
  on(BiteActions.loadedLatestFromAPI, (state, { bites }) => ({
    ...state,
    latestBites: bites,
  })),
  on(BiteActions.loadedByUserFromAPI, (state, { bites }) => ({
    ...state,
    bitesByUserId: bites,
  })),
  on(BiteActions.loadedByBucketlistFromAPI, (state, { bites }) => ({
    ...state,
    bitesByBucketlist: bites,
  })),
  on(saveLike, (state, { like, previousLikeType }) =>
    adjustBiteLikeCounts(
      state,
      like.biteId,
      saveLikeDeltas(like.likeType, previousLikeType, 1),
    ),
  ),
  on(saveLikeFailed, (state, { like, previousLikeType }) =>
    adjustBiteLikeCounts(
      state,
      like.biteId,
      saveLikeDeltas(like.likeType, previousLikeType, -1),
    ),
  ),
  on(removeLike, (state, { like }) =>
    adjustBiteLikeCounts(state, like.biteId, { [like.likeType]: -1 }),
  ),
  on(removeLikeFailed, (state, { like }) =>
    adjustBiteLikeCounts(state, like.biteId, { [like.likeType]: 1 }),
  ),
);

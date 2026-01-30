import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { BiteActions } from './actions';
import { fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(
    BiteActions.loadedByGPSPositionFromAPI,
    BiteActions.loadedByUserFromAPI,
    BiteActions.loadedByBucketlistFromAPI,
    (state, { bites }) => {
      return adapter.upsertMany(bites, state);
    },
  ),
  on(BiteActions.deletedBite, (state, { bite }) => {
    return adapter.removeOne(bite.id, state);
  }),
  on(BiteActions.cacheBite, (state, { bite }) => {
    return {
      ...state,
      cachedBite: bite,
    };
  }),
  on(BiteActions.setEditingBite, (state, { bite }) => {
    return {
      ...state,
      editingBite: bite,
    };
  }),
  on(BiteActions.saveNewBite, (state) => {
    return {
      ...state,
      cachedBite: undefined,
    };
  }),
  on(BiteActions.savedBite, (state, { bite }) => {
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
  on(BiteActions.noPublicCreatorForBite, (state) => {
    return {
      ...state,
      biteCreator: undefined,
    };
  }),
  on(BiteActions.loadedLatestFromAPI, (state, { bites }) => {
    return {
      ...state,
      latestBites: bites,
    };
  }),
);

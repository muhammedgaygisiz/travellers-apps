import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { BiteActions } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(
    BiteActions.loadedByGPSPositionFromAPI,
    BiteActions.loadedByUserFromAPI,
    (state, { bites }) => {
      return adapter.upsertMany(bites, state);
    },
  ),
  on(BiteActions.cacheBite, (state, { bite }) => {
    return {
      ...state,
      cachedBite: bite,
    };
  }),
  on(BiteActions.saveNewBite, (state) => {
    return {
      ...state,
      cachedBite: undefined,
    };
  }),
  on(BiteActions.loadedBiteCreator, (state, { biteCreator }) => {
    return {
      ...state,
      biteCreator,
    };
  }),
  on(BiteActions.noPublicCreatorForBite, (state) => {
    return {
      ...state,
      biteCreator: undefined,
    };
  }),
);

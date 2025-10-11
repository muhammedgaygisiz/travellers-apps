import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { BiteActions } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(BiteActions.loadedFromAPI, (state, { bites }) => {
    const stateWithoutReloading = {
      ...state,
      reloading: false,
    };

    const cleanState = adapter.removeAll(stateWithoutReloading);
    return adapter.upsertMany(bites, cleanState);
  }),
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
  on(BiteActions.reloadBites, (state) => {
    return {
      ...state,
      reloading: true,
    };
  }),
  on(BiteActions.stopReloadingBites, (state) => {
    return {
      ...state,
      reloading: false,
    };
  }),
  on(BiteActions.noPublicCreatorForBite, (state) => {
    return {
      ...state,
      biteCreator: undefined,
    };
  }),
);

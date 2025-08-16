import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import {
  cacheBite,
  loadedBiteCreator,
  loadedBitesFromApi,
  noPublicCreatorForBite,
  reloadBites,
  saveNewBite,
} from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedBitesFromApi, (state, { bites }) =>
    adapter.upsertMany(bites, initialState)
  ),
  on(cacheBite, (state, { bite }) => {
    return {
      ...state,
      cachedBite: bite,
    };
  }),
  on(saveNewBite, (state) => {
    return {
      ...state,
      cachedBite: undefined,
    };
  }),
  on(loadedBiteCreator, (state, { biteCreator }) => {
    return {
      ...state,
      biteCreator,
    };
  }),
  on(reloadBites, (state) => {
    return {
      ...state,
      reloading: true,
    };
  }),
  on(loadedBitesFromApi, (state) => {
    return {
      ...state,
      reloading: false,
    };
  }),
  on(noPublicCreatorForBite, (state) => {
    return {
      ...state,
      biteCreator: undefined,
    };
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import {
  cacheBite,
  loadedBiteCreator,
  loadedBitesFromApi,
  noPublicCreatorForBite,
  saveNewBite,
} from './actions';

export const reducer = createReducer(
  initialState,
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
  on(noPublicCreatorForBite, (state) => {
    return {
      ...state,
      biteCreator: undefined,
    };
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { cacheBite, loadedBitesFromApi, saveNewBite } from './actions';

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
  })
);

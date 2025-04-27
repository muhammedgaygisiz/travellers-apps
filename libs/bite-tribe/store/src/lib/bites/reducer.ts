import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedBitesFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedBitesFromApi, (state, { bites }) =>
    adapter.upsertMany(bites, initialState)
  )
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedBanksFromIndexedDb } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedBanksFromIndexedDb, (state, { banks }) => {
    return adapter.upsertMany(banks, state);
  })
);

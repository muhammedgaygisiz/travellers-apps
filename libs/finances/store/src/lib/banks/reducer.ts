import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedBanksFromFirestore, loadedBanksFromIndexedDb } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedBanksFromIndexedDb, loadedBanksFromFirestore, (state, { banks }) =>
    adapter.upsertMany(banks, state)
  )
);

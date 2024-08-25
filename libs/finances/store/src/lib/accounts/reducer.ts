import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedAccountsFromIndexedDb } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedAccountsFromIndexedDb, (state, { accounts }) => {
    return adapter.upsertMany(accounts, state);
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import {
  loadedAccountsFromFirestore,
  loadedAccountsFromIndexedDb,
} from './actions';

export const reducer = createReducer(
  initialState,
  on(
    loadedAccountsFromIndexedDb,
    loadedAccountsFromFirestore,
    (state, { accounts }) => adapter.upsertMany(accounts, state)
  )
);

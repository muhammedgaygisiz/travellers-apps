import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import {
  loadedPaymentsFromFirestore,
  loadedPaymentsFromIndexedDb,
} from './actions';

export const reducer = createReducer(
  initialState,
  on(
    loadedPaymentsFromFirestore,
    loadedPaymentsFromIndexedDb,
    (state, { payments }) => adapter.upsertMany(payments, initialState)
  )
);

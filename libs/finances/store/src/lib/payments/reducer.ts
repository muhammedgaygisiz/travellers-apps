import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import {
  loadedPaymentsFromFirestore,
  loadedPaymentsFromIndexedDb,
  updatedPayment,
} from './actions';

export const reducer = createReducer(
  initialState,
  on(
    loadedPaymentsFromFirestore,
    loadedPaymentsFromIndexedDb,
    (state, { payments }) => adapter.upsertMany(payments, initialState)
  ),
  on(updatedPayment, (state, { payment }) => {
    return adapter.upsertOne(payment, state);
  })
);

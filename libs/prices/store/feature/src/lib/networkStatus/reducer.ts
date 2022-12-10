import { Action, createReducer, on } from '@ngrx/store';
import { networkStatusChanged } from './actions';

export const reducer = createReducer<undefined | boolean, Action>(
  navigator.onLine,
  on(networkStatusChanged, (state, { isOnline }) => isOnline)
);

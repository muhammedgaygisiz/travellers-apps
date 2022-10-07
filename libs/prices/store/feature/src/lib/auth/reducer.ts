import { Action, createReducer, on } from '@ngrx/store';
import { loginSucceeded, notAuthenticated } from './actions';

export const reducer = createReducer<boolean, Action>(
  false,
  on(loginSucceeded, () => true),
  on(notAuthenticated, () => false)
);

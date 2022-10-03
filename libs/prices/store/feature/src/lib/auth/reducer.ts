import { createReducer, on } from '@ngrx/store';
import { loginSucceeded, notAuthenticated } from './actions';

export const reducer = createReducer(
  false,
  on(loginSucceeded, () => true),
  on(notAuthenticated, () => false)
);

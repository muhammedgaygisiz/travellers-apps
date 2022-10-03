import { createReducer, on } from '@ngrx/store';
import { loginSucceeded } from './actions';

export const reducer = createReducer(
  false,
  on(loginSucceeded, () => true)
);

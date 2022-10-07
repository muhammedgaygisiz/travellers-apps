import { Action, createReducer, on } from '@ngrx/store';
import { locationLoaded } from './actions';

export const reducer = createReducer<undefined | string, Action>(
  undefined,
  on(locationLoaded, (state, { location }) => location)
);

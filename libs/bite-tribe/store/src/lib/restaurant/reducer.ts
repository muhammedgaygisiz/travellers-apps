import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedRestaurant } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedRestaurant, (state, { restaurant }) => {
    return adapter.upsertOne(restaurant, state);
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedRestaurantFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedRestaurantFromApi, (state, { restaurant }) => {
    return adapter.upsertOne(restaurant, state);
  })
);

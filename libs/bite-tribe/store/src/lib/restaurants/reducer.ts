import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedRestaurantFromApi, loadedRestaurantsFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedRestaurantsFromApi, (state, { restaurants }) => {
    return adapter.upsertMany(restaurants, initialState);
  }),
  on(loadedRestaurantFromApi, (state, { restaurant }) => {
    return adapter.upsertOne(restaurant, state);
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import {
  loadedRestaurantFromApi,
  loadedRestaurantsFromApi,
  setRestaurantToCreate,
} from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedRestaurantsFromApi, (state, { restaurants }) => {
    return adapter.upsertMany(restaurants, initialState);
  }),
  on(loadedRestaurantFromApi, (state, { restaurant }) => {
    return adapter.upsertOne(restaurant, state);
  }),
  on(setRestaurantToCreate, (state, { restaurant }) => {
    return {
      ...state,
      restaurantToCreate: restaurant,
    };
  })
);

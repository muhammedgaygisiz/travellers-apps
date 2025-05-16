import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedMenuFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedMenuFromApi, (state, { menu }) =>
    adapter.upsertOne(menu, initialState)
  )
);

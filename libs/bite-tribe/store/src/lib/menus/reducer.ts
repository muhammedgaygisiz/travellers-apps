import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedMenuFromApi, loadedMenusFromApi } from './actions';

export const reducer = createReducer(
  initialState,
  on(loadedMenusFromApi, (state, { menus }) => {
    return adapter.upsertMany(menus, initialState);
  }),
  on(loadedMenuFromApi, (state, { menu }) => {
    return adapter.upsertOne(menu, initialState);
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { loadedMenuFromApi, loadedMenusFromApi } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(loadedMenusFromApi, (state, { menus }) => {
    return adapter.upsertMany(menus, initialState);
  }),
  on(loadedMenuFromApi, (state, { menu }) => {
    return adapter.upsertOne(menu, initialState);
  })
);

import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { MenuActions } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => adapter.removeAll(state)),
  on(MenuActions.loadedMenusFromAPI, (state, { menus }) => {
    return adapter.upsertMany(menus, initialState);
  }),
  on(MenuActions.loadedMenuFromAPI, (state, { menu }) => {
    return adapter.upsertOne(menu, initialState);
  }),
);

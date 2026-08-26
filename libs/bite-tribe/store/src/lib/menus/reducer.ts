import { createReducer, on } from '@ngrx/store';
import { adapter, initialState } from './adapter';
import { MenuActions } from './actions';
import { fromAuth } from 'ta-firestore';

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, (state) => ({
    ...adapter.removeAll(state),
    failedMenuId: undefined,
  })),
  // A read that is in flight again is no longer a failed one, so the page goes
  // back to its loading state instead of keeping the failure on screen.
  on(MenuActions.loadMenu, (state) => ({
    ...state,
    failedMenuId: undefined,
  })),
  on(MenuActions.loadedMenusFromAPI, (state, { menus }) => {
    return adapter.upsertMany(menus, initialState);
  }),
  on(MenuActions.loadedMenuFromAPI, (state, { menu }) => {
    return adapter.upsertOne(menu, initialState);
  }),
  on(
    MenuActions.noMenuFound,
    MenuActions.menuLoadFailed,
    (state, { menuId }) => ({
      ...state,
      failedMenuId: menuId,
    }),
  ),
);

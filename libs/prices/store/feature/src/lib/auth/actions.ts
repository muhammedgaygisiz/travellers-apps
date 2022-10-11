import { createAction, props } from '@ngrx/store';
import { AuthCredentials } from '@travellers-apps/utils-common';

export const login = createAction(
  '[Auth Page] Login',
  props<{ authCreds: AuthCredentials }>()
);

export const loginSucceeded = createAction('[Auth API] Login successful');

export const loginFailed = createAction('[Auth API] Login failed');

export const logoutSucceeded = createAction('[Auth API] Logout successful');

export const notAuthenticated = createAction('[Auth API] Not logged in');

export const logout = createAction('[Auth Page] Logout');

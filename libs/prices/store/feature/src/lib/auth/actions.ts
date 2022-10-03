import { createAction, props } from '@ngrx/store';
import { AuthCredentials } from '@travellers-apps/utils-common';

export const login = createAction(
  '[Auth Page] Login',
  props<{ authCreds: AuthCredentials }>()
);

export const loginSucceeded = createAction('[Auth API] Login successful');
export const notAuthenticated = createAction('[Auth API] Not logged in');

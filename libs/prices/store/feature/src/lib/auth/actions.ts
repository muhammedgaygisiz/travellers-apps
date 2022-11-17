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

export const register = createAction(
  '[Registration Page] Register With Email',
  props<{ registration: AuthCredentials }>()
);

export const loginWithGoogleAccount = createAction(
  '[Registration Page] Login With Google Account'
);

export const registrationSucceeded = createAction(
  '[Auth API] Registration successful'
);

export const registrationFailed = createAction(
  '[Auth API] Registration failed',
  props<{ code: string }>()
);

export const confirmRegistrationErrorMessage = createAction(
  '[Registration Page] Confirm error message'
);

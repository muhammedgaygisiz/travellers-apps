import { createAction, props } from '@ngrx/store';
import { AuthCredentials } from '@travellers-apps/utils-common';

export const login = createAction(
  '[Auth Page] Login',
  props<{ authCreds: AuthCredentials }>()
);

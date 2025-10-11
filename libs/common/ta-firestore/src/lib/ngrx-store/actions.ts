import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AuthCredentials } from '../api/auth-credentials.model';

export const AuthActions = createActionGroup({
  source: 'AUTH',
  events: {
    Login: props<{ authCreds: AuthCredentials }>(),
    'Login succeeded': emptyProps(),
    'Loaded user': props<{ user: any }>(),
    'Login failed': emptyProps(),
    'Logout succeeded': emptyProps(),
    Logout: emptyProps(),
    'Register with Email': props<{ registration: AuthCredentials }>(),
    'Login with Google Account': emptyProps(),
    'Login with Apple Account': emptyProps(),
    'Registration succeeded': emptyProps(),
    'Registration failed': props<{ code: string }>(),
    'Confirm registration error message': emptyProps(),
  },
});

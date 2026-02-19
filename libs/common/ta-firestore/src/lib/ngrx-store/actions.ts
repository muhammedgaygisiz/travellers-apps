import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AuthCredentials } from '../api/auth-credentials.model';
import { User } from '@capacitor-firebase/authentication';

export const AuthActions = createActionGroup({
  source: 'AUTH',
  events: {
    Login: props<{ authCreds: AuthCredentials }>(),
    'Login succeeded': emptyProps(),
    'Loaded user': props<{ user: User | null | undefined }>(),
    'Login failed': emptyProps(),
    'Logout succeeded': emptyProps(),
    'Logout failed': emptyProps(),
    Logout: emptyProps(),
    'Register with Email': props<{ registration: AuthCredentials }>(),
    'Login with Google Account': emptyProps(),
    'Login with Apple Account': emptyProps(),
    'Registration succeeded': emptyProps(),
    'Registration failed': props<{ code: string }>(),
  },
});

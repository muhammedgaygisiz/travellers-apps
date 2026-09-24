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
    /**
     * A sign-in that never got a verdict, because the request carried no usable
     * App Check token (issue #1621). Distinct from `Login failed`, which says
     * Firebase looked at the credentials and turned them down: nothing here is
     * the account's fault and nothing about it is worth telling the user on the
     * login form, since the App Check gate has the screen by the time this is
     * dispatched. It releases the form and says nothing else.
     */
    'Login blocked by App Check': emptyProps(),
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

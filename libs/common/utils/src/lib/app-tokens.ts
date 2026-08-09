import { InjectionToken, Signal } from '@angular/core';

export const APP_TITLE = new InjectionToken<string>('app-title');

/**
 * The non-secret identity of the signed-in account, reduced to what a
 * navigation surface can show: the avatar and the display name the profile
 * page already renders. See GitHub issue #1260.
 */
export interface SignedInAccount {
  displayName: string;
  photoUrl: string;
}

/**
 * Supplies the signed-in account to the shared page chrome, which lives in
 * `scope:common` and so cannot reach an app's own user store. Each app binds it
 * in its shell; an app that leaves it unbound keeps the anonymous menu.
 *
 * It is a signal rather than a value because the identity changes with the
 * session while the page chrome stays mounted.
 */
export const SIGNED_IN_ACCOUNT = new InjectionToken<
  Signal<SignedInAccount | undefined>
>('signed-in-account');

export const AFTER_LOGOUT_PAGE = new InjectionToken<string>(
  'after-logout-page',
);
export const AFTER_LOGIN_PAGE = new InjectionToken<string>('after-login-page');

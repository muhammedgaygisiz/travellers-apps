import { InjectionToken, Signal } from '@angular/core';
import { BiteTribeRole } from './user-role';

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

/**
 * The roles an app admits, any one of which is enough to sign in.
 *
 * Bound by the shell of each privileged app: `business` and `staff` in the
 * business app, `admin` in the admin app. The consumer app leaves it unbound,
 * which is what keeps it ungated — an unbound token means "no role required",
 * not "no role granted".
 *
 * Sign-in checks it and **fails the login** when none is held, rather than
 * signing the account in and then refusing it a page. That is deliberate: a
 * rejection after a successful sign-in tells whoever is trying that the
 * password was right, that the account exists, and which role guards the app.
 * A generic login failure tells them nothing (issue #1469).
 *
 * **This is the first gate, and `roleGuard` is the second.** They are not
 * redundant: this one refuses the sign-in, the guard covers a restored session
 * and a revoked role. Widening one without the other is the mistake issue
 * #1075 made and then caught in the emulator — the guard admitted a staff
 * account that this token had already turned away at the door.
 *
 * A set rather than one role, because the business app admits two: a staff
 * account holds `staff` and **not** `business`. They are alternatives, and the
 * one pair that could mean "both at once" is refused by `setUserRoles`.
 */
export const REQUIRED_ROLES = new InjectionToken<BiteTribeRole[]>(
  'required-roles',
);

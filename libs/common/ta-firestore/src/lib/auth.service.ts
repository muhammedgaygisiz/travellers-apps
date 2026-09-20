import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  shareReplay,
  skip,
} from 'rxjs';
import { AuthCredentials } from './api/auth-credentials.model';
import {
  AuthStateChange,
  FirebaseAuthentication,
  LinkResult,
  SignInResult,
  User,
} from '@capacitor-firebase/authentication';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Capacitor } from '@capacitor/core';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from './provide-firestore-utils';
import { BiteTribeRole, rolesFromClaims } from 'utils';
import { terminate } from 'firebase/firestore';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { NavController } from '@ionic/angular';

/**
 * How long a caller waits for Firebase to report whether a persisted session
 * exists before it has to decide without that answer.
 */
export const AUTH_RESTORE_TIMEOUT_MS = 5_000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly auth = inject(FIREBASE_AUTH);
  readonly firestore = inject(FIREBASE_FIRESTORE);
  readonly navController = inject(NavController);

  readonly _authStateChange$ = new BehaviorSubject<AuthStateChange | null>(
    null,
  );

  readonly authStateChange$ = this._authStateChange$
    .asObservable()
    .pipe(skip(1));

  authState = toSignal(this.authStateChange$);

  private authStateRestored = false;
  private resolveAuthStateRestored!: () => void;

  private readonly authStateRestoredPromise = new Promise<void>((resolve) => {
    this.resolveAuthStateRestored = resolve;
  });

  authStateChangeListener = (result: AuthStateChange): void => {
    this._authStateChange$.next(result);
    this.markAuthStateRestored();
  };

  /**
   * Whether Firebase has reported whether a persisted session exists. Until it
   * has, a missing user means "not known yet", not "signed out".
   */
  isAuthStateRestored(): boolean {
    return this.authStateRestored;
  }

  /**
   * Resolves once that answer has arrived, immediately when it already has.
   *
   * On the web `getCurrentUser()` reads `auth.currentUser`, which is still null
   * while the persisted session is being read out of IndexedDB, so a cold load
   * looks signed out to a user who is signed in. The conclusive answer arrives
   * with the first `authStateChange` event — for a signed-out visitor too — and
   * everything that decides on the current user waits for it rather than
   * deciding on a timer (issue #1246).
   *
   * The wait is bounded: a platform that never answers must not hang a route
   * forever. Reaching that bound is a failure, not the expected path.
   */
  whenAuthStateRestored(): Promise<void> {
    if (this.authStateRestored) {
      return Promise.resolve();
    }

    return Promise.race([
      this.authStateRestoredPromise,
      new Promise<void>((resolve) =>
        setTimeout(resolve, AUTH_RESTORE_TIMEOUT_MS),
      ),
    ]);
  }

  private markAuthStateRestored(): void {
    if (this.authStateRestored) {
      return;
    }

    this.authStateRestored = true;
    this.resolveAuthStateRestored();
  }

  getUser(): User | null | undefined {
    return this.authState()?.user;
  }

  /**
   * The signed-in **member**, or nothing (GitHub issue #1101).
   *
   * Since a guest at a table signs in anonymously to hold a table session,
   * "somebody is signed in" and "a BiteTribe member is signed in" stopped being
   * the same question. {@link getUser} answers the first, which is what every
   * caller that writes a document for the current account needs; this answers
   * the second, which is what the route guards need.
   *
   * A separate method rather than a narrowing of `getUser`, because the twenty
   * or so callers of that one are asking the first question and are right to.
   * An anonymous guest *does* have a uid, and their session document is written
   * against it.
   */
  getMember(): User | null | undefined {
    const user = this.getUser();

    return user?.isAnonymous ? null : user;
  }

  /**
   * Signs in anonymously, so a guest who scanned a table code has an identity
   * to hold a session against (GitHub issue #1101).
   *
   * Called only from the table-scan flow, and only when nobody is signed in -
   * an existing session is kept, so a member who scans a code orders as
   * themselves and a guest who scans a second table keeps the uid their first
   * session belongs to.
   *
   * What the anonymity buys is not privacy but a *stable* identity without an
   * account: the uid is what `firestore.rules` matches a session document
   * against, and what {@link upgradeGuestSession} later upgrades in place
   * through `linkWith*` (issue #1657), so the guest who
   * decides at the end of the meal to keep the Bite they just ate does not lose
   * the session that knows what they ordered.
   *
   * `createUserOnAuthCreate` skips a provider-less account, so this writes no
   * `/users` document. A guest who never registers leaves a Firebase Auth
   * record and nothing in the product.
   */
  async signInAsGuest(): Promise<User | null> {
    const existing = this.getUser();

    if (existing) {
      return existing;
    }

    const { user } = await FirebaseAuthentication.signInAnonymously();

    if (user) {
      this._authStateChange$.next({ user });
      this.markAuthStateRestored();
    }

    return user ?? null;
  }

  /**
   * Force-refreshes the current user's ID token. Returns `true` when the token
   * was refreshed, `false` when the session is no longer valid (e.g. the
   * refresh token was revoked, or went stale after long inactivity or an app
   * update). Never throws — callers decide how to react to an invalid session.
   */
  async refreshSession(): Promise<boolean> {
    try {
      await FirebaseAuthentication.getIdToken({ forceRefresh: true });
      return true;
    } catch (error) {
      console.warn('Failed to refresh auth session:', error);
      return false;
    }
  }

  /**
   * The roles the current ID token carries, empty when the account has none or
   * when nobody is signed in.
   *
   * This is the **display and routing** answer, not the authorization answer.
   * A client can only read the token it was given, so nothing here is trusted:
   * every privileged callable re-reads the claim from the token Firebase
   * verified server-side. What it buys is that a signed-in account without the
   * role is told so, instead of reaching a page whose every request then fails.
   *
   * `forceRefresh` mints a new token rather than reusing the cached one, which
   * is how a role granted moments ago becomes visible without waiting out the
   * hour a Firebase ID token lives. Guards pass it on their first miss only:
   * refreshing on every navigation would put a network round-trip in front of
   * each route.
   *
   * Never throws. A token read that fails is reported as "no roles", because
   * the alternative is an unhandled rejection inside a route guard, which
   * Angular surfaces as a navigation error and a blank page.
   */
  async getRoles(forceRefresh = false): Promise<BiteTribeRole[]> {
    if (!this.getUser()) {
      return [];
    }

    try {
      const { claims } = await FirebaseAuthentication.getIdTokenResult({
        forceRefresh,
      });

      return rolesFromClaims(claims);
    } catch (error) {
      console.warn('Failed to read roles from the ID token:', error);
      return [];
    }
  }

  async hasRole(role: BiteTribeRole, forceRefresh = false): Promise<boolean> {
    return this.hasAnyRole([role], forceRefresh);
  }

  /**
   * Whether the token carries **any** of `roles`.
   *
   * The business app admits two roles rather than one: a staff account holds
   * `staff` and not `business`, so a check for `business` alone would sign it
   * out at the door. "Any" rather than "all" because the roles a route admits
   * are alternatives — a route needing two roles at once has never existed, and
   * the pair that could express it is refused by `setUserRoles`.
   */
  async hasAnyRole(
    roles: readonly BiteTribeRole[],
    forceRefresh = false,
  ): Promise<boolean> {
    const held = await this.getRoles(forceRefresh);

    return roles.some((role) => held.includes(role));
  }

  /**
   * Ends a session that was never allowed to start, without the teardown and
   * page reload {@link logout} performs.
   *
   * Used when sign-in succeeded at Firebase but the account lacks the role the
   * app requires. The reload in `logout` would wipe the NgRx store, and the
   * store is what carries the failure message the login page shows — reusing it
   * here would sign the account out and then hide the reason. There is nothing
   * to tear down either: the rejected account never reached a page that
   * registers a Firestore listener.
   *
   * Never throws. A sign-out that fails must not turn a clean rejection into an
   * unhandled error, and the caller reports the same generic failure either
   * way.
   */
  async endRejectedSession(): Promise<void> {
    try {
      await FirebaseAuthentication.signOut();
    } catch (error) {
      console.warn('Failed to sign out a rejected session:', error);
    }

    this._authStateChange$.next(null);
  }

  async initialize(): Promise<void> {
    const currentUser = await FirebaseAuthentication.getCurrentUser();
    this._authStateChange$.next(currentUser);

    // The native SDKs answer from an already-restored session, so their first
    // answer is final either way. On the web only a user is conclusive; a null
    // there waits for the `authStateChange` event below.
    if (Capacitor.isNativePlatform() || currentUser?.user) {
      this.markAuthStateRestored();
    }

    await FirebaseAuthentication.addListener(
      'authStateChange',
      this.authStateChangeListener.bind(this),
    );
  }

  /**
   * Whether a **member** is signed in.
   *
   * An anonymous guest is not one (issue #1101). Everything downstream of this
   * - the menu, the shell, the account surface - is built for somebody with a
   * profile, and a guest who scanned a table code has none: reporting them as
   * logged in would walk them into an app they never signed up for, with an
   * empty name at the top of it.
   */
  isLoggedIn$ = this.authStateChange$.pipe(
    map((authState) => !!authState?.user && !authState.user.isAnonymous),
    distinctUntilChanged(),
    shareReplay(1),
  );

  public async loginWithUsernameAndPassword(
    authCreds: AuthCredentials,
  ): Promise<SignInResult> {
    return await FirebaseAuthentication.signInWithEmailAndPassword({
      ...authCreds,
    });
  }

  public async logout(): Promise<void> {
    try {
      await FirebaseFirestore.removeAllListeners();
    } catch (error) {
      console.error('Error removing Firestore listeners during logout:', error);
    }

    try {
      await FirebaseAuthentication.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }

    try {
      await terminate(this.firestore);
    } catch (error) {
      console.error('Error terminating Firestore:', error);
    }

    if (!Capacitor.isNativePlatform()) {
      try {
        await FirebaseFirestore.clearPersistence();
      } catch (error) {
        console.error('Error clearing Firestore persistence:', error);
      }
    }

    this._authStateChange$.next(null);

    this.navController.navigateRoot('login');
    this.reloadPage();
  }

  reloadPage(): void {
    window.location.reload();
  }

  /**
   * Whether the session in hand is the anonymous one a table scan mints
   * (GitHub issue #1101).
   *
   * `isAnonymous` comes off the Firebase user rather than off the token, so it
   * is right the moment the link returns rather than an hour later.
   */
  private isGuestSession(): boolean {
    return this.getUser()?.isAnonymous === true;
  }

  /**
   * Turns the anonymous account a table guest holds into the account they
   * registered, without changing the uid (GitHub issue #1657).
   *
   * The uid is the whole point. The guest's `tableSessions` document is
   * *named* after it, their orders carry it, and `firestore.rules` matches
   * both against `request.auth.uid` - so a sign-up that minted a new account
   * would hand the guest an empty one and leave the meal they just ate on a
   * uid nothing will ever sign into again. `RD-TS-4` rests on this.
   *
   * Two things have to happen after the link, and neither is Firebase's doing:
   *
   * The **token** still says `anonymous`. `isMember()` in `firestore.rules`
   * and `requireMember` in the callables both read that, so a new member who
   * skipped the refresh would meet empty lists rather than errors, for as long
   * as an hour (`RD-TS-40`).
   *
   * The **profile** does not exist. `createUserOnAuthCreate` is a
   * `beforeUserCreated` blocking trigger and the account already existed, so
   * linking fires nothing; `upgradeGuestAccount` writes the same document the
   * trigger would have. It is best effort on purpose: the account *is*
   * registered by then, so failing the registration over it would report a
   * failure for something that succeeded, and the callable is idempotent so a
   * later call repairs it.
   */
  private async upgradeGuestSession(
    link: () => Promise<LinkResult>,
  ): Promise<SignInResult> {
    const result = await link();

    await this.refreshSession();

    try {
      await FirebaseFunctions.callByName<void, { created: boolean }>({
        name: 'upgradeGuestAccount',
      });
    } catch (error) {
      console.warn('Failed to write the profile for a linked account:', error);
    }

    // The uid did not change, so the plugin reports no auth state change and
    // `getMember()` would go on reading the user object it already had - the
    // one that says `isAnonymous`. Every route guard asks that question.
    const { user } = await FirebaseAuthentication.getCurrentUser();

    if (user) {
      this._authStateChange$.next({ user });
    }

    return result;
  }

  public async registerWithUsernameAndPassword(
    registration: AuthCredentials,
  ): Promise<SignInResult> {
    if (this.isGuestSession()) {
      return await this.upgradeGuestSession(() =>
        FirebaseAuthentication.linkWithEmailAndPassword({
          email: registration.email,
          password: registration.password,
        }),
      );
    }

    return await FirebaseAuthentication.createUserWithEmailAndPassword({
      email: registration.email,
      password: registration.password,
    });
  }

  /**
   * Sends the Firebase Auth verification mail in `languageCode`.
   *
   * This mail is rendered from the Firebase email templates, not by the app, so
   * the only way to choose its language is the auth instance's language code.
   * Left unset it is always English, which is how issue \#1264 shipped. The
   * language code is set per send rather than once at start-up because the app
   * language can change while the session lives.
   *
   * Setting it is best effort: a platform that rejects the language must not
   * cost the user their verification mail, so the send still runs and Firebase
   * falls back to English.
   */
  public async sendEmailVerification(languageCode?: string): Promise<void> {
    if (languageCode) {
      try {
        await FirebaseAuthentication.setLanguageCode({ languageCode });
      } catch (error) {
        console.warn('Failed to set the auth email language:', error);
      }
    }

    await FirebaseAuthentication.sendEmailVerification();
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
    await FirebaseAuthentication.sendPasswordResetEmail({ email });
  }

  public async signInWithGoogleAccount(): Promise<SignInResult> {
    if (this.isGuestSession()) {
      return await this.upgradeGuestSession(() =>
        FirebaseAuthentication.linkWithGoogle({ mode: 'popup' }),
      );
    }

    return await FirebaseAuthentication.signInWithGoogle({ mode: 'popup' });
  }

  public async signInWithAppleAccount(): Promise<SignInResult> {
    if (this.isGuestSession()) {
      return await this.upgradeGuestSession(() =>
        FirebaseAuthentication.linkWithApple({ mode: 'popup' }),
      );
    }

    return await FirebaseAuthentication.signInWithApple({ mode: 'popup' });
  }

  async setupAnalyticsAndCrashlytics(currentUser: User): Promise<void> {
    const user = currentUser;

    if (user && !process.env['NX_APP_BITE_TRIBE_IS_BUSINESS']) {
      await FirebaseAnalytics.setUserId({
        userId: user.uid,
      });

      if (Capacitor.isNativePlatform()) {
        await FirebaseCrashlytics.setUserId({
          userId: user.uid,
        });
      }
    }
  }
}

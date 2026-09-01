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
  SignInResult,
  User,
} from '@capacitor-firebase/authentication';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from './provide-firestore-utils';
import { terminate } from 'firebase/firestore';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { NavController } from '@ionic/angular';
import { AnalyticsConsentService } from './analytics/analytics-consent.service';

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
  private readonly analyticsConsent = inject(AnalyticsConsentService);

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

  isLoggedIn$ = this.authStateChange$.pipe(
    map((authState) => !!authState?.user),
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

  public async registerWithUsernameAndPassword(
    registration: AuthCredentials,
  ): Promise<SignInResult> {
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
    return await FirebaseAuthentication.signInWithGoogle({ mode: 'popup' });
  }

  public async signInWithAppleAccount(): Promise<SignInResult> {
    return await FirebaseAuthentication.signInWithApple({ mode: 'popup' });
  }

  /**
   * Attaches the signed-in user to the analytics and crash streams, but only
   * where that was consented to.
   *
   * A uid is pseudonymous rather than anonymous - it joins straight back to the
   * account - so it is exactly the identifier a declined consent is refusing.
   * The null branch matters as much as the granted one: a user who withdraws in
   * settings needs the id already sent on this device cleared, not merely left
   * to go stale.
   */
  async setupAnalyticsAndCrashlytics(currentUser: User): Promise<void> {
    const user = currentUser;

    if (!user || process.env['NX_APP_BITE_TRIBE_IS_BUSINESS']) {
      return;
    }

    const consent = this.analyticsConsent.consent();

    await FirebaseAnalytics.setUserId({
      userId: consent.analytics === 'granted' ? user.uid : null,
    });

    if (Capacitor.isNativePlatform()) {
      // Crashlytics types the id as a plain string rather than a nullable one,
      // so an empty string is how the association is cleared here.
      await FirebaseCrashlytics.setUserId({
        userId: consent.crashReporting === 'granted' ? user.uid : '',
      });
    }
  }
}

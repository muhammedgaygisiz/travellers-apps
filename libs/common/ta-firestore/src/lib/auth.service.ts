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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { UserCredential } from '@firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly auth = inject(FIREBASE_AUTH);
  readonly firestore = inject(FIREBASE_FIRESTORE);

  readonly _authStateChange$ = new BehaviorSubject<AuthStateChange | null>(
    null,
  );
  readonly authStateChange$ = this._authStateChange$
    .asObservable()
    .pipe(skip(1));

  authState = toSignal(this.authStateChange$);

  getUser(): User | null | undefined {
    return this.authState()?.user;
  }

  async initialize(): Promise<void> {
    const currentUser = await FirebaseAuthentication.getCurrentUser();
    this._authStateChange$.next(currentUser);

    await FirebaseAuthentication.addListener('authStateChange', (result) => {
      this._authStateChange$.next(result);
    });
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
    await FirebaseAuthentication.signOut();

    await this.auth.signOut();

    await FirebaseFirestore.removeAllListeners();
    await terminate(this.firestore);

    if (!Capacitor.isNativePlatform()) {
      await FirebaseFirestore.clearPersistence();
    }

    this._authStateChange$.next(null);

    window.location.reload();
  }

  public async registerWithUsernameAndPassword(
    registration: AuthCredentials,
  ): Promise<UserCredential> {
    return await createUserWithEmailAndPassword(
      this.auth,
      registration.email,
      registration.password,
    );
  }

  public async registerWithGoogleAccount(): Promise<SignInResult> {
    return await FirebaseAuthentication.signInWithGoogle({ mode: 'popup' });
  }

  public async registerWithAppleAccount(): Promise<SignInResult> {
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

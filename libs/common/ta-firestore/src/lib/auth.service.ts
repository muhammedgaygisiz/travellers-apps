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

  authStateChangeListener = (result: any): void => {
    this._authStateChange$.next(result);
  };

  getUser(): User | null | undefined {
    return this.authState()?.user;
  }

  async initialize(): Promise<void> {
    const currentUser = await FirebaseAuthentication.getCurrentUser();
    this._authStateChange$.next(currentUser);

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

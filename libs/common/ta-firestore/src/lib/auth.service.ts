import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  from,
  map,
  Observable,
  shareReplay,
  skip,
  tap,
} from 'rxjs';
import { AuthCredentials } from './api/auth-credentials.model';
import {
  AuthStateChange,
  FirebaseAuthentication,
  GetCurrentUserResult,
  SignInResult,
} from '@capacitor-firebase/authentication';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from './provide-firestore-utils';
import { terminate } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { User } from '@capacitor-firebase/authentication';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FIREBASE_FIRESTORE);

  private readonly _authStateChange$ =
    new BehaviorSubject<AuthStateChange | null>(null);
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

  public loginWithUsernameAndPassword$(
    authCreds: AuthCredentials,
  ): Observable<SignInResult> {
    return from(
      FirebaseAuthentication.signInWithEmailAndPassword({ ...authCreds }),
    );
  }

  public async logout(): Promise<void> {
    await FirebaseAuthentication.signOut();

    await this.auth.signOut();

    await FirebaseFirestore.removeAllListeners();
    await terminate(this.firestore);

    if (!Capacitor.isNativePlatform()) {
      await FirebaseFirestore.clearPersistence();
    }

    return Promise.resolve();
  }

  public registerWithUsernameAndPassword$(
    registration: AuthCredentials,
  ): Observable<any> {
    return from(
      createUserWithEmailAndPassword(
        this.auth,
        registration.email,
        registration.password,
      ),
    );
  }

  public registerWithGoogleAccount$(): Observable<SignInResult> {
    return from(FirebaseAuthentication.signInWithGoogle({ mode: 'popup' }));
  }

  public registerWithAppleAccount$(): Observable<SignInResult> {
    return from(FirebaseAuthentication.signInWithApple({ mode: 'popup' }));
  }

  setupAnalyticsAndCrashlytics(currentUser: User): void {
    const user = currentUser;

    if (user && !process.env['NX_APP_BITE_TRIBE_IS_BUSINESS']) {
      FirebaseAnalytics.setUserId({
        userId: user.uid,
      });

      if (Capacitor.isNativePlatform()) {
        FirebaseCrashlytics.setUserId({
          userId: user.uid,
        });
      }
    }
  }
}

import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  from,
  map,
  Observable,
  shareReplay,
  tap,
} from 'rxjs';
import { AuthCredentials } from './api/auth-credentials.model';
import {
  AuthStateChange,
  FirebaseAuthentication,
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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FIREBASE_FIRESTORE);
  authStateChange$ = new BehaviorSubject<AuthStateChange | null>(null);

  authState = toSignal(this.authStateChange$);

  async initilize(): Promise<void> {
    const currentUser = await FirebaseAuthentication.getCurrentUser();
    this.authStateChange$.next(currentUser);

    await FirebaseAuthentication.addListener('authStateChange', (result) => {
      this.authStateChange$.next(result);
    });
  }

  isLoggedIn$ = this.authStateChange$.pipe(
    map((authState) => {
      if (authState?.user && !process.env['NX_APP_BITE_TRIBE_IS_BUSINESS']) {
        FirebaseAnalytics.setUserId({
          userId: authState.user.uid,
        });

        if (Capacitor.isNativePlatform()) {
          FirebaseCrashlytics.setUserId({
            userId: authState.user.uid,
          });
        }
      }

      return !!authState?.user;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public loginWithUsernameAndPassword$(
    authCreds: AuthCredentials
  ): Observable<SignInResult> {
    return from(
      FirebaseAuthentication.signInWithEmailAndPassword({ ...authCreds })
    );
  }

  public logout(): Observable<void> {
    return from(FirebaseAuthentication.signOut()).pipe(
      tap(async () => {
        await this.auth.signOut();

        await FirebaseFirestore.removeAllListeners();
        await terminate(this.firestore);

        if (!Capacitor.isNativePlatform()) {
          await FirebaseFirestore.clearPersistence();
        }
      })
    );
  }

  public registerWithUsernameAndPassword$(
    registration: AuthCredentials
  ): Observable<any> {
    return from(
      createUserWithEmailAndPassword(
        this.auth,
        registration.email,
        registration.password
      )
    );
  }

  public registerWithGoogleAccount$(): Observable<SignInResult> {
    return from(FirebaseAuthentication.signInWithGoogle({ mode: 'popup' }));
  }

  public registerWithAppleAccount$(): Observable<SignInResult> {
    return from(FirebaseAuthentication.signInWithApple({ mode: 'popup' }));
  }

  public registerWithFacebookAccount$(): Observable<SignInResult> {
    return from(FirebaseAuthentication.signInWithFacebook({ mode: 'popup' }));
  }
}

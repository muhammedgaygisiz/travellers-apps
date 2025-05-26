import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, from, map, tap } from 'rxjs';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
} from '@angular/fire/auth';
import { AuthCredentials } from './api/auth-credentials.model';
import {
  AuthStateChange,
  FirebaseAuthentication,
} from '@capacitor-firebase/authentication';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  authStateChange$ = new BehaviorSubject<AuthStateChange | null>(null);

  authState = toSignal(this.authStateChange$);

  async initilize() {
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
      }

      return !!authState?.user;
    }),
    distinctUntilChanged()
  );

  public loginWithUsernameAndPassword$(authCreds: AuthCredentials) {
    return from(
      FirebaseAuthentication.signInWithEmailAndPassword({ ...authCreds })
    );
  }

  public logout() {
    return from(FirebaseAuthentication.signOut()).pipe(
      tap(async () => {
        await getAuth().signOut();
      })
    );
  }

  public registerWithUsernameAndPassword$(registration: AuthCredentials) {
    return from(
      createUserWithEmailAndPassword(
        this.auth,
        registration.email,
        registration.password
      )
    );
  }

  public registerWithGoogleAccount$() {
    return from(FirebaseAuthentication.signInWithGoogle({ mode: 'popup' }));
  }

  public registerWithAppleAccount$() {
    return from(FirebaseAuthentication.signInWithApple({ mode: 'popup' }));
  }

  public registerWithFacebookAccount$() {
    return from(FirebaseAuthentication.signInWithFacebook({ mode: 'popup' }));
  }
}

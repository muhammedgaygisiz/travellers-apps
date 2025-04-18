import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, from, map, tap } from 'rxjs';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
} from '@angular/fire/auth';
import { AuthCredentials } from './api/auth-credentials.model';
import {
  AuthStateChange,
  FirebaseAuthentication,
} from '@capacitor-firebase/authentication';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly authStateChange$ =
    new BehaviorSubject<AuthStateChange | null>(null);

  initilize() {
    FirebaseAuthentication.addListener('authStateChange', (result) => {
      console.log('Auth state changed:', result);
      this.authStateChange$.next(result);
    });
  }

  isLoggedIn$ = this.authStateChange$.pipe(
    map((authState) => !!authState?.user)
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
    return from(signInWithRedirect(this.auth, new GoogleAuthProvider()));
  }
}

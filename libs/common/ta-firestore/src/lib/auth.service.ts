import { inject, Injectable } from '@angular/core';
import { from, tap } from 'rxjs';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  signOut,
} from '@angular/fire/auth';
import { AuthCredentials } from './api/auth-credentials.model';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);

  public isLoggedIn$() {
    return authState(this.auth);
  }

  public loginWithUsernameAndPassword$(authCreds: AuthCredentials) {
    return from(
      FirebaseAuthentication.signInWithEmailAndPassword({ ...authCreds })
    ).pipe(tap((res) => console.log('#mo', res)));
  }

  public logout() {
    return from(signOut(this.auth));
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

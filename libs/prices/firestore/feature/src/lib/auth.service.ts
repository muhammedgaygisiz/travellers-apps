import { inject, Injectable } from '@angular/core';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { from } from 'rxjs';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  GoogleAuthProvider,
} from '@angular/fire/auth';

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
      signInWithEmailAndPassword(this.auth, authCreds.email, authCreds.password)
    );
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

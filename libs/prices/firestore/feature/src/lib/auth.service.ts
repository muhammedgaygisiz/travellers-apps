import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { from, Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import UserCredential = firebase.auth.UserCredential;

/**
 * for google auth example check link
 * https://github.com/firebase/quickstart-js/blob/master/auth/google-redirect.html
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly afa: AngularFireAuth
  ) {}

  public isLoggedIn$() {
    return this.afa.authState;
  }

  public loginWithUsernameAndPassword$(
    authCreds: AuthCredentials
  ): Observable<UserCredential> {
    return from(
      this.afa.signInWithEmailAndPassword(authCreds.email, authCreds.password)
    );
  }

  public logout() {
    return from(this.afa.signOut());
  }

  public registerWithUsernameAndPassword$(
    registration: AuthCredentials
  ): Observable<UserCredential> {
    return from(
      this.afa.createUserWithEmailAndPassword(
        registration.email,
        registration.password
      )
    );
  }

  public registerWithGoogleAccount$() {
    return from(
      this.afa.signInWithRedirect(new firebase.auth.GoogleAuthProvider())
    );
  }
}

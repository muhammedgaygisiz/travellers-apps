import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { from, Observable } from 'rxjs';
import firebase from 'firebase/compat';
import UserCredential = firebase.auth.UserCredential;

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
      this.afa.signInWithEmailAndPassword(
        authCreds.username,
        authCreds.password
      )
    );
  }
}

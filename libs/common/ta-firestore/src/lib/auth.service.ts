import { inject, Injectable } from '@angular/core';
import { from, map, tap } from 'rxjs';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
} from '@angular/fire/auth';
import { AuthCredentials } from './api/auth-credentials.model';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);

  public isLoggedIn$() {
    return from(FirebaseAuthentication.getCurrentUser()).pipe(
      map((user) => !!user.user)
    );
  }

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

import { Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { login, loginSucceeded, notAuthenticated } from './actions';
import { catchError, EMPTY, map, mergeMap, Observable, tap } from 'rxjs';
import { AuthService } from '@travellers-apps/prices/firestore/feature';
import firebase from 'firebase/compat';
import UserCredential = firebase.auth.UserCredential;
import { AuthCredentials } from '@travellers-apps/utils-common';
import User = firebase.User;

@Injectable()
export class AuthEffects {
  checkAuthStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      tap(() => console.log('#mo effects init')),
      mergeMap(() =>
        (this.authService.isLoggedIn$() as Observable<User | null>).pipe(
          map((user) => {
            if (user) {
              return loginSucceeded();
            }

            return notAuthenticated();
          })
        )
      )
    )
  );

  loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login.type),
      mergeMap(({ authCreds }: { authCreds: AuthCredentials }) =>
        (
          this.authService.loginWithUsernameAndPassword$(
            authCreds
          ) as Observable<UserCredential>
        ).pipe(
          // eslint-disable-next-line no-unused-vars
          map((_) => {
            return loginSucceeded();
          }),
          tap(() => {
            console.log('#mo', authCreds);
            localStorage.setItem('username', authCreds.username);
          }),
          catchError(() => EMPTY)
        )
      )
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly authService: AuthService
  ) {}
}

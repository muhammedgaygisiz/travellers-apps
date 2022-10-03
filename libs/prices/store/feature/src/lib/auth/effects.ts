import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { login, loginSucceeded } from './actions';
import { catchError, EMPTY, map, mergeMap, Observable } from 'rxjs';
import { AuthService } from '@travellers-apps/prices/firestore/feature';
import firebase from 'firebase/compat';
import UserCredential = firebase.auth.UserCredential;

@Injectable()
export class AuthEffects {
  loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login.type),
      mergeMap(({ authCreds }) =>
        (
          this.authService.loginWithUsernameAndPassword$(
            authCreds
          ) as Observable<UserCredential>
        ).pipe(
          map((userCredentials) => {
            console.log('#mo effect', userCredentials);
            return loginSucceeded();
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

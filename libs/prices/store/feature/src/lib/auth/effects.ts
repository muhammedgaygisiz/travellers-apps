import { Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import {
  login,
  loginSucceeded,
  logout,
  logoutSucceeded,
  notAuthenticated,
} from './actions';
import {
  catchError,
  EMPTY,
  exhaustMap,
  map,
  mergeMap,
  Observable,
  tap,
} from 'rxjs';
import { AuthService } from '@travellers-apps/prices/firestore/feature';
import firebase from 'firebase/compat';
import UserCredential = firebase.auth.UserCredential;
import { AuthCredentials } from '@travellers-apps/utils-common';
import User = firebase.User;
import { NavController } from '@ionic/angular';

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
          map(() => loginSucceeded()),
          tap(() => this.navController.back()),
          catchError(() => EMPTY)
        )
      )
    )
  );

  logoutEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logout.type),
      exhaustMap(() =>
        this.authService.logout().pipe(
          map(() => logoutSucceeded()),
          catchError(() => EMPTY)
        )
      )
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly authService: AuthService,
    // eslint-disable-next-line no-unused-vars
    private readonly navController: NavController
  ) {}
}

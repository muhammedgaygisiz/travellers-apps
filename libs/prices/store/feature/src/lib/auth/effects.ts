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
import { catchError, EMPTY, exhaustMap, map, mergeMap, tap } from 'rxjs';
import { AuthService } from '@travellers-apps/prices/firestore/feature';
import firebase from 'firebase/compat';
import { AuthCredentials } from '@travellers-apps/utils-common';
import User = firebase.User;
import { NavController } from '@ionic/angular';

type AuthCreds = { authCreds: AuthCredentials };

@Injectable()
export class AuthEffects {
  checkAuthStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      mergeMap(() =>
        this.authService.isLoggedIn$().pipe(map((user) => this.getAction(user)))
      )
    )
  );

  loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login.type),
      mergeMap(({ authCreds }: AuthCreds) =>
        this.login$(authCreds).pipe(
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

  private login$(authCreds: AuthCredentials) {
    return this.authService.loginWithUsernameAndPassword$(authCreds);
  }

  private getAction(user: User | null) {
    return user ? loginSucceeded() : notAuthenticated();
  }
}

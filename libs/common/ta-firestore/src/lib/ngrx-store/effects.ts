import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import {
  login,
  loginFailed,
  loginSucceeded,
  loginWithGoogleAccount,
  logout,
  logoutSucceeded,
  notAuthenticated,
  register,
  registrationFailed,
  registrationSucceeded,
} from './actions';
import { catchError, EMPTY, exhaustMap, map, mergeMap, of, tap } from 'rxjs';

import { User } from '@angular/fire/auth';
import { NavController } from '@ionic/angular';
import { AuthCredentials } from '../api/auth-credentials.model';
import { AuthService } from '../auth.service';

type AuthCreds = { authCreds: AuthCredentials };

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly navController = inject(NavController);

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
          catchError((err) => {
            console.log('#mo', err);
            return of(loginFailed());
          })
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

  registrationEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(register.type),
      mergeMap(({ registration }) =>
        this.register$(registration).pipe(
          map(() => registrationSucceeded()),
          tap(() => this.navController.back()),
          catchError((err) => {
            return of(registrationFailed({ code: err.code }));
          })
        )
      )
    )
  );

  loginWithGoogleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginWithGoogleAccount.type),
      mergeMap(() =>
        this.registerWithGoogleAccount$().pipe(
          map(() => registrationSucceeded()),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) => {
            return of(registrationFailed({ code: err.code }));
          })
        )
      )
    )
  );

  successFulLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loginSucceeded.type),
        tap(() => this.navController.navigateBack(['/']))
      ),
    { dispatch: false }
  );

  private login$(authCreds: AuthCredentials) {
    return this.authService.loginWithUsernameAndPassword$(authCreds);
  }

  private register$(registration: AuthCredentials) {
    return this.authService.registerWithUsernameAndPassword$(registration);
  }

  private registerWithGoogleAccount$() {
    return this.authService.registerWithGoogleAccount$();
  }

  private getAction(user: User | null) {
    return user ? loginSucceeded() : notAuthenticated();
  }
}

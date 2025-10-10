import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import {
  loadedUser,
  login,
  loginFailed,
  loginSucceeded,
  loginWithAppleAccount,
  loginWithGoogleAccount,
  logout,
  logoutSucceeded,
  register,
  registrationFailed,
  registrationSucceeded,
} from './actions';
import {
  catchError,
  EMPTY,
  exhaustMap,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { NavController } from '@ionic/angular';
import { AuthCredentials } from '../api/auth-credentials.model';
import { AuthService } from '../auth.service';
import { AFTER_LOGIN_PAGE, AFTER_LOGOUT_PAGE } from 'utils';
import { SignInResult } from '@capacitor-firebase/authentication';
import { Store } from '@ngrx/store';

type AuthCreds = { authCreds: AuthCredentials };

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly navController = inject(NavController);
  private readonly store = inject(Store);

  private readonly pageAfterLogout = inject(AFTER_LOGOUT_PAGE, {
    optional: true,
  });
  private readonly pageAfterLogin = inject(AFTER_LOGIN_PAGE, {
    optional: true,
  });

  constructor() {
    this.authService.initilize();
  }

  checkAuthStatus$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        switchMap(() =>
          this.authService.isLoggedIn$.pipe(
            map((isLoggedIn) => {
              if (isLoggedIn) {
                this.store.dispatch(loginSucceeded());
              }
            }),
          ),
        ),
      ),
    { dispatch: false },
  );

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginSucceeded),
      switchMap(() => this.authService.authStateChange$),
      map((authStateChange) => {
        return loadedUser({ user: authStateChange?.user });
      }),
    ),
  );

  loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login),
      mergeMap(({ authCreds }: AuthCreds) =>
        this.login$(authCreds).pipe(
          map(() => loginSucceeded()),
          catchError((err) => {
            console.debug('#mo error login: ', err);
            return of(loginFailed());
          }),
        ),
      ),
    ),
  );

  logoutEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logout.type),
      exhaustMap(() =>
        this.authService.logout().pipe(
          map(() => logoutSucceeded()),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );

  registrationEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(register),
      mergeMap(({ registration }) =>
        this.register$(registration).pipe(
          map(() => registrationSucceeded()),
          tap(() => this.navController.navigateBack(['/login'])),
          catchError((err) => {
            return of(registrationFailed({ code: err.code }));
          }),
        ),
      ),
    ),
  );

  loginWithGoogleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginWithGoogleAccount.type),
      mergeMap(() =>
        this.registerWithGoogleAccount$().pipe(
          map((result) => {
            console.debug('#mo signInResult', result);
            return loginSucceeded();
          }),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) => {
            return of(registrationFailed({ code: err.code }));
          }),
        ),
      ),
    ),
  );

  loginWithAppleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginWithAppleAccount),
      mergeMap(() => {
        return this.registerWithAppleAccount$().pipe(
          map(() => loginSucceeded()),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) => of(registrationFailed({ code: err.code }))),
        );
      }),
    ),
  );

  successFulLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loginSucceeded),
        tap(() => {
          const url =
            location.href.includes('/bite/') &&
            !location.href.includes('/edit');
          if (url) {
            return;
          }

          if (this.pageAfterLogin) {
            this.navController.navigateBack([this.pageAfterLogin]);
            return;
          }

          this.navController.navigateRoot(['/']);
        }),
      ),
    { dispatch: false },
  );

  successFulLogout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logoutSucceeded.type),
        tap(() => {
          if (this.pageAfterLogout) {
            this.navController.navigateRoot([this.pageAfterLogout]);
            return;
          }

          this.navController.navigateRoot(['/login']);
        }),
      ),
    { dispatch: false },
  );

  private login$(authCreds: AuthCredentials): Observable<SignInResult> {
    return this.authService.loginWithUsernameAndPassword$(authCreds);
  }

  private register$(registration: AuthCredentials): Observable<any> {
    return this.authService.registerWithUsernameAndPassword$(registration);
  }

  private registerWithGoogleAccount$(): Observable<SignInResult> {
    return this.authService.registerWithGoogleAccount$();
  }

  private registerWithAppleAccount$(): Observable<SignInResult> {
    return this.authService.registerWithAppleAccount$();
  }
}

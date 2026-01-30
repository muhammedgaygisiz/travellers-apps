import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { AuthActions } from './actions';
import {
  catchError,
  EMPTY,
  exhaustMap,
  from,
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
import { AFTER_LOGIN_PAGE, AFTER_LOGOUT_PAGE, isBiteDetailsPage } from 'utils';
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
    this.authService.initialize();
  }

  checkAuthStatus$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        switchMap(() =>
          this.authService.isLoggedIn$.pipe(
            map((isLoggedIn) => {
              if (isLoggedIn) {
                this.store.dispatch(AuthActions.loginSucceeded());
              }
            }),
          ),
        ),
      ),
    { dispatch: false },
  );

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSucceeded),
      map(() => {
        const authState = this.authService.authState();

        const user = authState?.user;
        return AuthActions.loadedUser({ user });
      }),
      tap(({ user }) => {
        if (user) {
          this.authService.setupAnalyticsAndCrashlytics(user);
        }
      }),
    ),
  );

  loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      mergeMap(({ authCreds }: AuthCreds) =>
        this.login$(authCreds).pipe(
          map(() => AuthActions.loginSucceeded()),
          catchError((err) => {
            console.debug('#mo error login: ', err);
            return of(AuthActions.loginFailed());
          }),
        ),
      ),
    ),
  );

  logoutEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        from(this.authService.logout()).pipe(
          map(() => AuthActions.logoutSucceeded()),
          catchError(() => of(AuthActions.logoutFailed())),
        ),
      ),
    ),
  );

  registrationEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.registerWithEmail),
      mergeMap(({ registration }) =>
        this.register$(registration).pipe(
          map(() => AuthActions.registrationSucceeded()),
          tap(() => this.navController.navigateBack(['/login'])),
          catchError((err) => {
            return of(AuthActions.registrationFailed({ code: err.code }));
          }),
        ),
      ),
    ),
  );

  loginWithGoogleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithGoogleAccount.type),
      mergeMap(() =>
        this.registerWithGoogleAccount$().pipe(
          map((result) => {
            console.debug('#mo signInResult', result);
            return AuthActions.loginSucceeded();
          }),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) => {
            return of(AuthActions.registrationFailed({ code: err.code }));
          }),
        ),
      ),
    ),
  );

  loginWithAppleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithAppleAccount),
      mergeMap(() => {
        return this.registerWithAppleAccount$().pipe(
          map(() => AuthActions.loginSucceeded()),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) =>
            of(AuthActions.registrationFailed({ code: err.code })),
          ),
        );
      }),
    ),
  );

  successFulLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSucceeded),
        tap(() => {
          const isBitePage = isBiteDetailsPage();

          if (isBitePage) {
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
        ofType(AuthActions.logoutSucceeded.type),
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

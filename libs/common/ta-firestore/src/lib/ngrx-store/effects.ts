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
  exhaustMap,
  from,
  map,
  of,
  switchMap,
  tap,
  timeout,
} from 'rxjs';

import { NavController } from '@ionic/angular';
import { AuthCredentials } from '../api/auth-credentials.model';
import { AuthService } from '../auth.service';
import { RequestedUrlService } from '../requested-url.service';
import { AFTER_LOGIN_PAGE, AFTER_LOGOUT_PAGE, isAuthEntryPage } from 'utils';
import { SignInResult } from '@capacitor-firebase/authentication';
import { Store } from '@ngrx/store';

type AuthCreds = { authCreds: AuthCredentials };

/**
 * Upper bound for the email/password sign-in round-trip. The login form is now
 * locked while it runs, so a request that never settles would leave the form
 * locked with it; a bounded failure keeps it retryable (issue #1273). The
 * native provider sheets are deliberately not bounded: the user is typing a
 * password in someone else's UI there, and that legitimately takes as long as
 * it takes.
 */
const LOGIN_TIMEOUT_MS = 30_000;

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly navController = inject(NavController);
  private readonly store = inject(Store);
  private readonly requestedUrlService = inject(RequestedUrlService);

  private hasRoutedAfterSignIn = false;

  private readonly pageAfterLogout = inject(AFTER_LOGOUT_PAGE, {
    optional: true,
  });
  private readonly pageAfterLogin = inject(AFTER_LOGIN_PAGE, {
    optional: true,
  });

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
      tap(async ({ user }) => {
        if (user) {
          await this.authService.setupAnalyticsAndCrashlytics(user);
        }
      }),
    ),
  );

  loginEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      // A sign-in that is already running is the answer to a second one, so a
      // duplicate submit is dropped rather than raced (issue #1273).
      exhaustMap(({ authCreds }: AuthCreds) =>
        from(this.login(authCreds)).pipe(
          timeout(LOGIN_TIMEOUT_MS),
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

  loginWithGoogleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithGoogleAccount),
      exhaustMap(() =>
        from(this.signInWithGoogleAccount()).pipe(
          map((result) => {
            console.debug('#mo signInResult', result);
            return AuthActions.loginSucceeded();
          }),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) =>
            of(AuthActions.registrationFailed({ code: err.code })),
          ),
        ),
      ),
    ),
  );

  loginWithAppleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithAppleAccount),
      exhaustMap(() =>
        from(this.signInWithAppleAccount()).pipe(
          map(() => AuthActions.loginSucceeded()),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) =>
            of(AuthActions.registrationFailed({ code: err.code })),
          ),
        ),
      ),
    ),
  );

  successFulLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSucceeded),
        tap(() => {
          // A session restored on startup reports itself as a successful login
          // too, and by then the visitor is already on the page they opened the
          // app at — a shared Bite link, say. Only someone who came through the
          // sign-in pages is routed onwards; anyone already inside the app
          // stays where they asked to be (issue #1246).
          if (!isAuthEntryPage()) {
            return;
          }

          // One sign-in reports itself twice: the login effect dispatches it,
          // and the startup session check sees the same user arrive. Only the
          // first may route — the second would find the requested URL already
          // consumed and send the visitor to the default page instead. A logout
          // reloads the document, so one routed sign-in per page is right.
          if (this.hasRoutedAfterSignIn) {
            return;
          }

          this.hasRoutedAfterSignIn = true;

          const requestedUrl = this.requestedUrlService.consume();
          if (requestedUrl) {
            this.navController.navigateRoot(requestedUrl);
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
        ofType(AuthActions.logoutSucceeded),
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

  private login(authCreds: AuthCredentials): Promise<SignInResult> {
    return this.authService.loginWithUsernameAndPassword(authCreds);
  }

  private signInWithGoogleAccount(): Promise<SignInResult> {
    return this.authService.signInWithGoogleAccount();
  }

  private signInWithAppleAccount(): Promise<SignInResult> {
    return this.authService.signInWithAppleAccount();
  }
}

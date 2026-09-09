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
import {
  AFTER_LOGIN_PAGE,
  AFTER_LOGOUT_PAGE,
  isAuthEntryPage,
  REQUIRED_ROLES,
} from 'utils';
import { SignInResult } from '@capacitor-firebase/authentication';
import { Action, Store } from '@ngrx/store';

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

/**
 * Raised when the credentials were right but the account lacks the role this
 * app requires.
 *
 * It is a distinct type only so the provider effects can tell it apart from a
 * genuine provider error and report the same generic login failure the
 * email/password path does. Nothing surfaces the distinction to the user: that
 * is the point (issue #1469).
 */
class MissingRequiredRoleError extends Error {
  constructor() {
    super('The account does not hold the role this app requires.');
  }
}

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

  /**
   * Unbound in the consumer app, which requires no role of anyone. The two
   * privileged apps bind it in their shells.
   */
  private readonly requiredRoles = inject(REQUIRED_ROLES, {
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
          // Before `loginSucceeded`, not after: that action is what routes the
          // visitor into the app, so an account that fails the role check must
          // never reach it.
          switchMap(() => from(this.assertRequiredRole())),
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
          switchMap((result) => {
            console.debug('#mo signInResult', result);
            return from(this.assertRequiredRole());
          }),
          map(() => AuthActions.loginSucceeded()),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) => of(this.toProviderFailure(err))),
        ),
      ),
    ),
  );

  loginWithAppleAccountEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithAppleAccount),
      exhaustMap(() =>
        from(this.signInWithAppleAccount()).pipe(
          switchMap(() => from(this.assertRequiredRole())),
          map(() => AuthActions.loginSucceeded()),
          tap(() => this.navController.navigateBack(['/'])),
          catchError((err) => of(this.toProviderFailure(err))),
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

  /**
   * Rejects a signed-in account that holds none of {@link requiredRoles}.
   *
   * The session is ended before the error is raised, so a rejected sign-in
   * leaves nothing behind: no token to deep-link with, no restored session to
   * pick up on the next load. The caller turns the error into the same generic
   * failure a wrong password produces.
   *
   * A cached ID token can be up to an hour old, so a miss is retried once
   * against a freshly minted one. Without that, an account granted its role
   * moments earlier would be turned away here.
   *
   * Any one of the roles is enough. The business app admits `business` and
   * `staff`, and a staff account holds `staff` and not `business` (#1075).
   */
  private async assertRequiredRole(): Promise<void> {
    const roles = this.requiredRoles;

    if (!roles?.length) {
      return;
    }

    if (await this.authService.hasAnyRole(roles)) {
      return;
    }

    if (await this.authService.hasAnyRole(roles, true)) {
      return;
    }

    await this.authService.endRejectedSession();

    throw new MissingRequiredRoleError();
  }

  /**
   * A missing role is reported as a login failure, not a registration failure:
   * `registrationFailed` only releases the pending flag, so the login page
   * would unlock with no message at all and the rejection would look like
   * nothing happened.
   */
  private toProviderFailure(err: unknown): Action {
    if (err instanceof MissingRequiredRoleError) {
      return AuthActions.loginFailed();
    }

    return AuthActions.registrationFailed({
      code: (err as { code?: string })?.code ?? 'unknown',
    });
  }

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

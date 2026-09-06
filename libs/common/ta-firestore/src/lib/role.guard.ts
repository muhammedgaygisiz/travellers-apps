import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthService } from './auth.service';
import { RequestedUrlService } from './requested-url.service';
import { AuthActions } from './ngrx-store/actions';
import { BiteTribeRole, PATH } from 'utils';

/**
 * Requires a role on top of a session.
 *
 * `authGuard` answers "is anyone signed in". It is the only check either
 * privileged app had, which is why any BiteTribe account could open the
 * business app and run our operational migrations from it (issue #1469). This
 * guard answers the second question: is it *this* account's app.
 *
 * Sign-in already refuses an account without the role, so in normal use this
 * guard never fires. It exists for the two paths that do not go through the
 * login effects:
 *
 * - a session restored on startup, which reports itself as a successful login
 *   without ever running the sign-in effect;
 * - a role revoked while a session is live.
 *
 * It runs **alongside** `authGuard` rather than after it — Angular activates a
 * route's guards concurrently, not in sequence — so it cannot assume auth has
 * been restored just because `authGuard` is on the same route. It waits for
 * restoration itself, exactly as every other guard reading the current user
 * has to (see the Cold Start Rules in `Architecture - Auth`).
 *
 * A rejected account is **signed out and returned to the login page with the
 * same generic failure a wrong password produces**. It is not shown a page
 * explaining which role it lacks: that would confirm the account exists, that
 * its credentials were right, and which role guards the app. The session is
 * ended rather than merely blocked, so there is no token left to retry a deep
 * link with.
 *
 * A cached ID token can be up to an hour old, so a first miss is retried once
 * against a freshly minted token. That is what keeps a role granted moments ago
 * from bouncing the account it was granted to.
 */
export const roleGuard =
  (role: BiteTribeRole): CanActivateFn =>
  async (_route, state): Promise<GuardResult> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const requestedUrlService = inject(RequestedUrlService);
    const store = inject(Store);

    await authService.whenAuthStateRestored();

    if (!authService.getUser()) {
      requestedUrlService.remember(state.url);

      return router.parseUrl(`/${PATH.START}`);
    }

    if (await authService.hasRole(role)) {
      return true;
    }

    // The cached token predates the grant, not the grant the token. Only a
    // miss pays for the refresh.
    if (await authService.hasRole(role, true)) {
      return true;
    }

    await authService.endRejectedSession();
    store.dispatch(AuthActions.loginFailed());

    return router.parseUrl('/login');
  };

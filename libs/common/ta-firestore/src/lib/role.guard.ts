import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RequestedUrlService } from './requested-url.service';
import { BiteTribeRole, PATH } from 'utils';

/**
 * Requires a role on top of a session.
 *
 * `authGuard` answers "is anyone signed in". It is the only check either
 * privileged app had, which is why any BiteTribe account could open the
 * business app and run our operational migrations from it (issue #1469). This
 * guard answers the second question: is it *this* account's app.
 *
 * It runs **alongside** `authGuard` rather than after it — Angular activates a
 * route's guards concurrently, not in sequence — so it cannot assume auth has
 * been restored just because `authGuard` is on the same route. It waits for
 * restoration itself, exactly as every other guard reading the current user
 * has to (see the Cold Start Rules in `Architecture - Auth`).
 *
 * The two negative answers are deliberately different destinations:
 *
 * - **Signed out** is `authGuard`'s case, and this guard defers to it: it
 *   remembers the requested URL and sends the visitor to `START`, so signing
 *   in returns them to where they were headed.
 * - **Signed in without the role** is not a login problem. `START` offers only
 *   a sign-in the account has already completed, so sending it there states the
 *   problem wrongly and leaves the user with nothing to act on. It goes to
 *   `NO_ACCESS`, which names the missing role. (In the consumer shell `START`
 *   also carries `startGuard`, which forwards a signed-in visitor straight back
 *   out — but the two apps this guard protects do not use that guard, so the
 *   reason here is the misleading message rather than a redirect loop.)
 *
 * A cached ID token can be up to an hour old, so a first miss is retried once
 * against a freshly minted token. That is what makes a role granted through
 * the admin app take effect without the user signing out and back in.
 */
export const roleGuard =
  (role: BiteTribeRole): CanActivateFn =>
  async (_route, state): Promise<GuardResult> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const requestedUrlService = inject(RequestedUrlService);

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

    return router.parseUrl(`/${PATH.NO_ACCESS}?role=${role}`);
  };

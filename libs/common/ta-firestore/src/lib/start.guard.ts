import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RequestedUrlService } from './requested-url.service';
import { AFTER_LOGIN_PAGE, PATH } from 'utils';

/**
 * Keeps signed-in users off the welcome page.
 *
 * A visitor can only be here with a session if `authGuard` sent them, which it
 * does when their session was not restored in time. They asked for somewhere
 * else, so that address wins over Home — otherwise the redirect chain out of a
 * shared Bite link ends on the feed with the Bite gone (issue #1246).
 *
 * "Signed in" means a member, not merely a session. A guest holding an
 * anonymous session from a scanned table code who then opens the app belongs on
 * the welcome page like anybody else, and bouncing them to Home would be
 * bouncing them into an account they do not have (issue #1101).
 *
 * A member goes to the app's own landing page, `AFTER_LOGIN_PAGE`: Home in the
 * consumer app, the dashboard in the business and admin apps. Those two put
 * the guard on their start page too (issue #2305), because their back button
 * falls back to `/`, which redirects here, and a signed-in owner who reloaded
 * a page and pressed back landed on Log In / Sign Up.
 */
export const startGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requestedUrlService = inject(RequestedUrlService);
  const pageAfterLogin =
    inject(AFTER_LOGIN_PAGE, { optional: true }) ?? `/${PATH.HOME}`;

  if (authService.getMember()) {
    return router.parseUrl(requestedUrlService.consume() ?? pageAfterLogin);
  }

  return true;
};

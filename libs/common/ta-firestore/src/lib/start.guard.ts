import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RequestedUrlService } from './requested-url.service';
import { PATH } from 'utils';

/**
 * Keeps signed-in users off the welcome page.
 *
 * A visitor can only be here with a session if `authGuard` sent them, which it
 * does when their session was not restored in time. They asked for somewhere
 * else, so that address wins over Home — otherwise the redirect chain out of a
 * shared Bite link ends on the feed with the Bite gone (issue #1246).
 */
export const startGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requestedUrlService = inject(RequestedUrlService);

  const authState = authService.authState();

  if (authState?.user) {
    return router.parseUrl(requestedUrlService.consume() ?? `/${PATH.HOME}`);
  }

  return true;
};

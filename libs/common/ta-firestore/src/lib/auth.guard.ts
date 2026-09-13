import { CanActivateFn, GuardResult, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RequestedUrlService } from './requested-url.service';
import { isPrivacyPage, isAccountDeletionPage, PATH } from 'utils';

/**
 * Protects the authenticated surface, and waits for auth to be restored before
 * judging a visitor who arrives cold.
 *
 * On the web a cold load — a shared Bite link opened in a new tab — runs this
 * guard while the persisted session is still being read out of IndexedDB, so
 * the signed-in visitor looks signed out. Waiting a fixed two seconds and then
 * redirecting to `/start` discarded the requested URL for both answers: a
 * signed-in visitor was forwarded on to Home by `startGuard`, and a signed-out
 * one lost the Bite they were sent (issue #1246).
 *
 * So the guard waits on the restoration itself rather than a timer, and when
 * the visitor really is signed out it remembers where they were headed, so
 * signing in returns them to it.
 *
 * It asks for a **member** and not merely for a session (issue #1101). A guest
 * who scanned a table QR code signs in anonymously to hold their table session,
 * and that session must not be a way into the app: `getUser()` would report
 * them as signed in and hand them the feed, the gallery and a profile page with
 * nobody behind it. The table route is public and carries no auth guard, so it
 * is unaffected.
 */
export const authGuard: CanActivateFn = async (
  _route,
  state,
): Promise<GuardResult> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requestedUrlService = inject(RequestedUrlService);

  if (isPrivacyPage()) {
    return true;
  }

  if (isAccountDeletionPage()) {
    return true;
  }

  if (authService.getMember()) {
    return true;
  }

  await authService.whenAuthStateRestored();

  if (authService.getMember()) {
    return true;
  }

  requestedUrlService.remember(state.url);

  return router.parseUrl(`/${PATH.START}`);
};

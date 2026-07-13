import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Network } from '@capacitor/network';
import { AuthService } from './auth.service';

/**
 * Ensures the auth session is still valid before entering an effort-heavy flow
 * (e.g. creating a Bite with a photo). Force-refreshing the ID token here
 * repairs a token gone stale after long inactivity or an app update, and fails
 * fast to re-auth instead of letting the later image upload fail with
 * `storage/unauthenticated` after the user has already done the work.
 *
 * Skipped when offline, where the token cannot be refreshed and offline
 * (text-only) creation is still allowed.
 */
export const freshSessionGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const { connected } = await Network.getStatus();
  if (!connected) {
    return true;
  }

  const refreshed = await authService.refreshSession();

  return refreshed ? true : router.parseUrl('/start');
};

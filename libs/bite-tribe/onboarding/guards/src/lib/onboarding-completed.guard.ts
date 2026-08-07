import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PATH } from 'utils';
import { RequestedUrlService } from 'ta-firestore';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';

/**
 * Keeps users who have already completed onboarding out of the onboarding route.
 * If they open it manually they are redirected into the app — to the page they
 * were headed for when something sent them here, and to Home otherwise
 * (issue #1246).
 */
export const onboardingCompletedGuard: CanActivateFn = async (): Promise<
  boolean | UrlTree
> => {
  const dataAccess = inject(OnboardingDataAccessService);
  const router = inject(Router);
  const requestedUrlService = inject(RequestedUrlService);

  const isComplete = await dataAccess.isOnboardingComplete();

  if (!isComplete) {
    return true;
  }

  return router.parseUrl(requestedUrlService.consume() ?? `/${PATH.HOME}`);
};

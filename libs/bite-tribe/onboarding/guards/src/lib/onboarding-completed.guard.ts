import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PATH } from 'utils';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';

/**
 * Keeps users who have already completed onboarding out of the onboarding route.
 * If they open it manually they are redirected into the app.
 */
export const onboardingCompletedGuard: CanActivateFn = async (): Promise<
  boolean | UrlTree
> => {
  const dataAccess = inject(OnboardingDataAccessService);
  const router = inject(Router);

  const isComplete = await dataAccess.isOnboardingComplete();

  return isComplete ? router.parseUrl(`/${PATH.HOME}`) : true;
};

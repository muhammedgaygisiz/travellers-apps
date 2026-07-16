import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PATH } from 'utils';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';

/**
 * Blocks every authenticated route for users who have not completed onboarding,
 * redirecting them to the onboarding assistant. Runs after `authGuard`, so it
 * only ever sees signed-in users.
 *
 * While the assistant is still a placeholder, a session-scoped dismissal lets
 * the user continue into the app; on the next login the gate applies again until
 * the completion flag is written in a follow-up issue.
 */
export const onboardingGuard: CanActivateFn = async (): Promise<
  boolean | UrlTree
> => {
  const dataAccess = inject(OnboardingDataAccessService);
  const router = inject(Router);

  if (dataAccess.dismissedForSession()) {
    return true;
  }

  const isComplete = await dataAccess.isOnboardingComplete();

  return isComplete ? true : router.parseUrl(`/${PATH.ONBOARDING}`);
};

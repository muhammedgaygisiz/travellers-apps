import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PATH } from 'utils';
import { RequestedUrlService } from 'ta-firestore';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';

/**
 * Blocks every authenticated route for users who have not completed onboarding,
 * redirecting them to the onboarding assistant. Runs alongside `authGuard`, so
 * it only ever lets signed-in users through.
 *
 * While the assistant is still a placeholder, a session-scoped dismissal lets
 * the user continue into the app; on the next login the gate applies again until
 * the completion flag is written in a follow-up issue.
 *
 * The displaced URL is remembered, so someone who followed a shared Bite link
 * into a first-run onboarding arrives at that Bite when the assistant is done,
 * rather than on Home (issue #1246).
 */
export const onboardingGuard: CanActivateFn = async (
  _route,
  state,
): Promise<boolean | UrlTree> => {
  const dataAccess = inject(OnboardingDataAccessService);
  const router = inject(Router);
  const requestedUrlService = inject(RequestedUrlService);

  if (dataAccess.dismissedForSession()) {
    return true;
  }

  const isComplete = await dataAccess.isOnboardingComplete();

  if (isComplete) {
    return true;
  }

  requestedUrlService.remember(state.url);

  return router.parseUrl(`/${PATH.ONBOARDING}`);
};

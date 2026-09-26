import { inject } from '@angular/core';
import { CanActivateFn, GuardResult } from '@angular/router';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';
import { publicMenuMemberGuard } from 'bite-tribe/store';
import { isReleasedFromOnboarding } from './onboarding-release';

/**
 * The guard on the published menu address, `m/:publicRestaurantId`
 * (GitHub issues #370 and #1654).
 *
 * `publicMenuMemberGuard` decides whether the reader is a member with a menu to
 * be handed to, and hands them to the app's own menu page. That page carries
 * `authGuard`, and so the onboarding gate with it: a member who installed the
 * app and stopped halfway through the assistant would be asked to finish it
 * first, standing at a table - worse off for having the app than a stranger,
 * who reads the menu straight away.
 *
 * So the hand-off is only taken when the onboarding gate would let them
 * through. Otherwise they stay on the published page, which asks nothing of
 * anybody. The gate itself is untouched on every authenticated route,
 * including the in-app menu reached any other way.
 *
 * It lives here rather than beside the member guard because the rule it asks -
 * completion flag and session dismissal alike - is owned by
 * `OnboardingDataAccessService`, which a `type:store` library cannot import.
 * Asking through {@link isReleasedFromOnboarding} keeps one reader of that rule.
 *
 * An answer the rule cannot obtain - a failed read of the user document -
 * comes back as "not onboarded", which here means the published page: the safe
 * side of this question is the menu, not a wall.
 */
export const publicMenuGuard: CanActivateFn = async (
  route,
): Promise<GuardResult> => {
  const dataAccess = inject(OnboardingDataAccessService);

  const handOff = await publicMenuMemberGuard(route);

  if (handOff === true) {
    return true;
  }

  return (await isReleasedFromOnboarding(dataAccess)) ? handOff : true;
};

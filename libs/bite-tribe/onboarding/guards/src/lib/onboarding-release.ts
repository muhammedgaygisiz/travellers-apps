import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';

/**
 * Whether the onboarding gate lets the current user into the app: they have
 * completed the assistant, or dismissed it for this session (issue #1011).
 *
 * The one reader of that rule. The entry gate asks it for every authenticated
 * route, and the published menu address asks it before handing a member on to
 * the app's own menu page (issue #1654). Two readers of one rule is how they
 * start disagreeing, and the wrong answer on the menu address is the
 * assistant standing in front of a restaurant's menu.
 *
 * The dismissal is read first, so a dismissed session reads no state.
 */
export const isReleasedFromOnboarding = async (
  dataAccess: OnboardingDataAccessService,
): Promise<boolean> =>
  dataAccess.dismissedForSession() || dataAccess.isOnboardingComplete();

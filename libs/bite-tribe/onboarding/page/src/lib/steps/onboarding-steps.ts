import type { OnboardingStepId } from 'bite-tribe/onboarding-data-access';

export interface OnboardingStepDefinition {
  readonly id: OnboardingStepId;
  /** Transloco key for the step title shown in the shell header. */
  readonly titleKey: string;
}

/**
 * Ordered onboarding assistant steps. The shell renders these in sequence and
 * users cannot skip ahead or exit before the final step. The concrete inputs
 * for each step are filled in by follow-up issues (#1014, #1015, #1016); this
 * registry only fixes the order and titles (epic #850, issue #1013).
 *
 * This is the full registry, not necessarily what a given device shows.
 * `OnboardingService` narrows it on platforms where a step has nothing to ask:
 * `photos` exists only on Android, the one platform with a media location
 * permission (issue #1394).
 */
export const ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
  { id: 'identity', titleKey: 'onboarding-step-identity' },
  { id: 'visibility', titleKey: 'onboarding-step-visibility' },
  { id: 'currency', titleKey: 'onboarding-step-currency' },
  { id: 'language', titleKey: 'onboarding-step-language' },
  { id: 'location', titleKey: 'onboarding-step-location' },
  { id: 'photos', titleKey: 'onboarding-step-photos' },
  { id: 'notifications', titleKey: 'onboarding-step-notifications' },
  { id: 'finish', titleKey: 'onboarding-step-finish' },
];

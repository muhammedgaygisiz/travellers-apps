export { OnboardingContainerComponent } from './lib/integration/onboarding-container.component';
export { OnboardingService } from './lib/integration/onboarding.service';
export { OnboardingPage } from './lib/components/onboarding-page/onboarding.page';
export {
  ONBOARDING_STEPS,
  type OnboardingStepDefinition,
} from './lib/steps/onboarding-steps';

// The entry-gate guards deliberately live in the separate
// `bite-tribe/onboarding-guards` library. This library is lazily loaded by the
// shell, so re-exporting the guards here would force a static import of it and
// drag the whole assistant (and its image upload chain) into the initial
// bundle — which Nx also rejects outright.

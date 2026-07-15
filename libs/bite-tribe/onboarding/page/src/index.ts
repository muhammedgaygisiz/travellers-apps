export { OnboardingContainerComponent } from './lib/integration/onboarding-container.component';
export { OnboardingService } from './lib/integration/onboarding.service';
export { OnboardingPage } from './lib/components/onboarding-page/onboarding.page';
export {
  ONBOARDING_STEPS,
  type OnboardingStepDefinition,
} from './lib/steps/onboarding-steps';
export { onboardingGuard } from './lib/guards/onboarding.guard';
export { onboardingCompletedGuard } from './lib/guards/onboarding-completed.guard';
export { gateAuthenticatedRoutes } from './lib/guards/gate-authenticated-routes';

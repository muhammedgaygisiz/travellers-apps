# bite-tribe/onboarding

Onboarding entry gate and placeholder assistant page (epic #850, issue #1011).

- `onboardingGuard` redirects authenticated users without the completion flag to
  the onboarding route and blocks every other authenticated route.
- `onboardingCompletedGuard` keeps completed users out of the onboarding route,
  redirecting them into the app.
- `gateAuthenticatedRoutes` appends `onboardingGuard` to every route already
  protected by `authGuard`, so the gate covers the whole authenticated surface.
- `OnboardingContainerComponent` renders a dismissible placeholder until the real
  assistant shell arrives in a follow-up issue.

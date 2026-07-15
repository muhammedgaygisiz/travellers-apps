# bite-tribe/onboarding-data-access

Data access for the onboarding completion state.

`OnboardingDataAccessService` reads the current user's onboarding completion flag
from the `/users/{userId}` document and tracks a session-scoped dismissal used by
the entry gate while the assistant is still a placeholder (issue #1011, epic #850).

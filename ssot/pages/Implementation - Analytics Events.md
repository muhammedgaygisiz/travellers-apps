# Implementation - Analytics Events

- ## Purpose

  This page is the source of truth for the launch-critical product analytics
  taxonomy defined in issue 910 (part of [[epic-907]], Phase 2 / Week 3). It
  documents each event, how it is emitted in code, the launch dashboard to build
  in the GA4/Firebase console, and how to verify events in DebugView.

  See [[Architecture - Analytics]] for how this fits the wider analytics surface.

- ## How Events Are Emitted
- Events and their typed parameters live in
  `libs/common/ta-firestore/src/lib/analytics/analytics-events.ts`.
- They are sent through `AnalyticsService`
  (`libs/common/ta-firestore/src/lib/analytics/analytics.service.ts`), a thin
  typed wrapper over `FirebaseAnalytics.logEvent`.
- Tracking is best-effort: it never throws, and it no-ops in the business app
  (guarded by `NX_APP_BITE_TRIBE_IS_BUSINESS`, mirroring the analytics guard in
  `AuthService`).
- Events are emitted from the **integration layer** (services / route
  containers) that owns the behavior, never from presentational components.
- Event names follow the GA4 `snake_case` convention; parameter values are
  primitives only.
- ## Event Reference

  | Category   | Event                                 | Params                                                                       | Trigger                                                      | Owner                                                                        |
  | ---------- | ------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
  | Activation | `sign_up`                             | `method: string` (`'password'`)                                              | Registration succeeds                                        | `libs/common/ui/auth/.../registration/registration.service.ts`               |
  | Activation | `password_reset_requested`            | –                                                                            | Forgot-password form submitted                               | `libs/common/ui/auth/.../forgot-password/forgot-password.service.ts`         |
  | Activation | `password_reset_request_failed`       | `code: string`                                                               | Firebase rejects a forgot-password request                   | `libs/common/ui/auth/.../forgot-password/forgot-password.service.ts`         |
  | Activation | `email_verification_prompt_shown`     | `surface: 'home' \| 'settings' \| 'profile_edit'`                            | Eligible unverified user enters a prompt surface             | Home, settings, and profile integration services                             |
  | Activation | `email_verification_resend_tapped`    | `surface: 'home' \| 'settings' \| 'profile_edit'`                            | User taps resend verification email                          | Home, settings, and profile integration services                             |
  | Activation | `email_verification_resend_succeeded` | `surface: 'home' \| 'settings' \| 'profile_edit'`                            | Backend resend callable succeeds                             | Home, settings, and profile integration services                             |
  | Activation | `email_verification_resend_failed`    | `surface: 'home' \| 'settings' \| 'profile_edit'`, `reason: string`          | Backend resend callable fails or rate-limits                 | Home, settings, and profile integration services                             |
  | Activation | `email_verification_synced`           | `verified: boolean`, `source: 'app_start' \| 'app_resume' \| 'profile_edit'` | App syncs Firebase Auth email verification metadata          | `libs/bite-tribe/store/src/lib/app/effects.ts`                               |
  | Creation   | `bite_created`                        | –                                                                            | New Bite persisted                                           | `libs/bite-tribe/bite/page/.../integration/bite.service.ts`                  |
  | Creation   | `bucketlist_created`                  | –                                                                            | Bucket list created                                          | `libs/bite-tribe/bucketlist/page/.../integration/bucketlists.service.ts`     |
  | Creation   | `bucketlist_rated`                    | `rating: number`                                                             | BiteTrail rating submitted                                   | `libs/bite-tribe/bucketlist/page/.../integration/rate-bucketlist.service.ts` |
  | Discovery  | `search_performed`                    | –                                                                            | Query first reaches the min length (once per search session) | `libs/bite-tribe/search/page/.../integration/search.service.ts`              |
  | Discovery  | `restaurant_viewed`                   | `verified: boolean`                                                          | Restaurant / place page entered                              | `libs/bite-tribe/restaurant/page/.../integration/*restaurant-container*.ts`  |
  | Discovery  | `bite_viewed`                         | –                                                                            | Bite details page entered                                    | `libs/bite-tribe/details/page/.../integration/details.container.ts`          |
  | Onboarding | `onboarding_assistant_started`        | –                                                                            | Assistant loads for the first time in a session              | `libs/bite-tribe/onboarding/page/.../integration/onboarding.service.ts`      |
  | Onboarding | `onboarding_step_completed`           | `step: OnboardingStepId`                                                     | A step is persisted and marked complete on advance           | `libs/bite-tribe/onboarding/page/.../integration/onboarding.service.ts`      |
  | Onboarding | `onboarding_assistant_completed`      | –                                                                            | Completion flag is written on the finish step                | `libs/bite-tribe/onboarding/page/.../integration/onboarding.service.ts`      |
  | Onboarding | `coach_mark_dismissed`                | `surface: CoachMarkSurface`                                                  | A coach mark is dismissed for the first time                 | `libs/bite-tribe/coach-mark/src/lib/coach-mark-state.service.ts`             |

  The onboarding funnel events belong to the onboarding assistant epic ([[epic-850]],
  issue #1017), not to the launch taxonomy of issue 910. `onboarding_step_completed`
  fires once per step in order (`identity`, `visibility`, `currency`, `language`,
  `location`, `notifications`, `finish`); `onboarding_assistant_completed` fires
  once, after the `finish` step's completion write succeeds. `coach_mark_dismissed`
  carries the dismissed `CoachMarkSurface` id and fires only on the first dismissal
  per user, so re-entering a surface whose mark was already seen emits nothing.

- ### Auto-collected (no code)

  Retention and launch monitoring rely on events GA4 collects automatically plus
  the existing exception handler:

- `first_open`, `session_start`, `screen_view` — GA4 automatic collection.
- `exception` — emitted by `FirebaseErrorHandlerService`.
- ## Launch Dashboard Spec

  Build a daily-monitoring dashboard in the Firebase console (Analytics
  dashboard) or Looker Studio with these tiles. This is executed by the product
  owner against the logged-in console; the taxonomy above drives it.

  | Metric                        | Category          | Source                              |
  | ----------------------------- | ----------------- | ----------------------------------- |
  | New activated users / day     | Activation        | `sign_up` count                     |
  | Bites created / day           | Creation          | `bite_created` count                |
  | Bucket lists created / day    | Creation          | `bucketlist_created` count          |
  | Ratings submitted / day       | Creation          | `bucketlist_rated` count            |
  | Searches / day                | Discovery         | `search_performed` count            |
  | Restaurant + Bite views / day | Discovery         | `restaurant_viewed` + `bite_viewed` |
  | D1 / D7 retention             | Retention         | GA4 retention / cohort report       |
  | Daily active users            | Retention         | GA4 `session_start` / active users  |
  | Crash-free users              | Launch monitoring | Crashlytics + `exception`           |

  Keep the dashboard scoped to launch signals; resist adding vanity metrics.

- ## Agent-Operable Metrics

  The dashboard spec above is also **dashboard-as-code** so agents (and humans)
  can check metrics without opening the console:

- `tools/analytics/dashboard.config.mjs` — the tiles as data, derived from this
  page. Single source of truth for the report CLI.
- `tools/analytics/report.mjs` — queries the tiles against the GA4 Data API.
  Run `npm run analytics:report` (flags: `--days=<n>`, `--json`, `--dry-run`).
- `npm run analytics:report -- --dry-run` prints the planned queries and needs
  no credentials — safe for any agent to run.
- Live runs need `GA4_PROPERTY_ID` + a service-account key in
  `GOOGLE_APPLICATION_CREDENTIALS`; setup is in
  [`tools/analytics/README.md`](../../tools/analytics/README.md).

  GA4 has no API to create the visual dashboard/exploration, so the config +
  report is the reproducible substitute. Provisioning event **parameters** as GA4
  custom dimensions and registering key events via the Analytics **Admin API** is
  a documented follow-up (needs Editor access on the property).

- ## DebugView Verification Steps
  1. Build and run the app on a device/emulator (or web) signed into the Firebase
     project.
  2. Enable debug mode:
  - Android: `adb shell setprop debug.firebase.analytics.app <package-name>`.
  - iOS: add launch argument `-FIRDebugEnabled`.
  - Web: analytics debug is visible via the `google-analytics`/`g/collect`
    network calls; use the GA4 DebugView with the debug extension if needed. 3. Open Firebase console → Analytics → DebugView and select the debug device. 4. Exercise each flow and confirm the matching event appears with expected
    parameters:
  - Register a new account → `sign_up`.
  - Create a Bite → `bite_created`.
  - Create a bucket list → `bucketlist_created`; rate a BiteTrail →
    `bucketlist_rated`.
  - Type a search query (≥ 3 chars) → `search_performed`.
  - Open a restaurant/place → `restaurant_viewed`; open a Bite → `bite_viewed`.
  - Enter the onboarding assistant → `onboarding_assistant_started`; advance
    each step → `onboarding_step_completed` with the matching `step`; finish →
    `onboarding_assistant_completed`.
  - Dismiss a coach mark → `coach_mark_dismissed` with the matching `surface`. 5. Disable debug mode when done (Android: set the prop to `.none`).

- ## Related Pages
- [[Architecture - Analytics]]
- [[epic-907]]
- [[Current State - Roadmap]]
- [[Implementation - Testing]]

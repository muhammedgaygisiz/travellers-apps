# Current State - Roadmap

- ## Purpose

  This roadmap describes the launch path starting from 26 June 2026.

  The target is a public launch in roughly 6 to 8 weeks, with enough time to finish launch-critical technical work without endlessly polishing.

- ## Phase 1 - Launch Preparation

  Dates: 26 June 2026 to 17 July 2026.

- ### Status as of 25 July 2026

  BiteTribe has moved into Phase 2 (Product Intelligence), working toward the 31 July 2026 Release Candidate milestone. The launch-blocking backend work from Phase 1 is largely complete; the remaining launch-critical code item is issue 933 (App Check blocking behavior before enforcement).

- Completed or landed toward launch:
  - Firebase App Check hardening (monitoring and remaining fixes) has landed through issue 908; the App Check bootstrap and telemetry are in place. The remaining gate is issue 933 (switch startup failure to blocking behavior before Console enforcement).
  - The onboarding assistant has landed through [[epic-850]] (issue 850 closed 17 July 2026, all nine sub-issues complete).
  - Intermittent Bite photo upload failures have been addressed through issue 927 (closed 13 July 2026).
  - Bite address enrichment and city search have landed through issue 974.
  - Location-based Bite currency prefill has landed through issue 909 / PR \#965.
  - Client-side suspicious price validation has landed through issue 967.
  - Leaderboard reliability work has landed through issues 966 and 968.
  - Daily ranking-change notifications have landed through issue 971.
  - Profile badge display has landed through issue 975.
  - Restaurant candidate verification has landed through issue 942 as part of [[epic-778]].
  - Mandatory Bite restaurant/place selection has landed through issue 943 / PR \#981.
  - Map live-update camera stability has landed through issue 982.
  - Playwright login, registration, and create-Bite E2E coverage has landed through issue 983.
- Current gap to the Release Candidate milestone:
  - Issue 933 (App Check blocking behavior) has landed behind the `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` flag; enable Console enforcement and validate the enforced flag on devices.
  - Prove the launch-critical flows on devices and emulators, especially App Check enforcement readiness, notification delivery, city search quality, issue 978 currency prefill and manual override, suspicious-price UX, restaurant/place picker behavior, map camera stability, Playwright E2E reliability, and restaurant candidate verification state transitions.
- ### Week 1

  Focus: Firebase App Check.

- Monitor verified request ratio.
- Fix remaining App Check issues.
- Enable enforcement.
- ### Week 2

  Focus: Location and currency quality.

- Enrich Bite location using Google Places.
- Prefill currency from Bite location and validate the fallback/override edge cases.
- Test edge cases:
  - vacation usage
  - posting later
  - missing location
- ### Milestone

  All launch-blocking backend work completed.

- ## Phase 2 - Product Intelligence

  Dates: 20 July 2026 to 31 July 2026.

- ### Week 3

  Focus: Analytics.

- Define events.
- Implement Firebase Analytics.
- Verify events in DebugView.
- Build a dashboard with key metrics.
- Status: launch event taxonomy (`AnalyticsService` + activation/creation/discovery events) and its SSOT spec have landed through issue 910. DebugView verification and the launch dashboard are console follow-ups tracked in [[Implementation - Analytics Events]].
- ### Week 4

  Focus: Production readiness.

- Android testing.
- iOS testing.
- Web testing.
- Fix remaining launch blockers.
- Prepare App Store and Google Play assets.
- Execute Phases 0 to 2 of [[Current State - Nx And Dependency Migration Roadmap]] without combining Nx, Angular, native, and backend major upgrades into one change.
- Replace the `nx-loki` adapter with direct `oblador/loki` usage; the legacy Cypress E2E surface has been removed in favor of Playwright.
- Angular 22 is not a release-candidate prerequisite; it follows only after the Nx 23 workspace is stable and the Angular 22 dependency prerequisites are available.
- ### Onboarding assistant

  The onboarding assistant ([[epic-850]]) has landed. Issue \#850 was closed as completed on 17 July 2026 with all nine sub-issues done, so the first real users onboard through it.

- Blocking assistant after registration: unique display name, public/private decision, currency, language, notification priming (issues 1011 to 1015, 1023). Landed.
- Completion flag plus must-dismiss feature coach marks (issue 1016). Landed.
- Onboarding funnel analytics (issue 1017). Landed.
- Existing users without the completion flag get the assistant once, prefilled.
- ### Milestone

  Release Candidate ready.

  Onboarding assistant landed.

- ## Phase 3 - Public Launch

  Dates: 3 August 2026 to 16 August 2026.

- ### Week 5

  Focus: Soft launch.

- Publish the app.
- Announce to existing testers.
- Invite already-contacted influencers.
- Monitor Crashlytics and Analytics daily.
- ### Week 6

  Focus: Public launch.

- Instagram posts.
- Reddit where appropriate.
- LinkedIn.
- Friends and family.
- Travel communities.
- ### Goal

  The first few hundred real users.

- ## Phase 4 - Learn

  Dates: August 2026 to September 2026.

  Focus: learn from real usage instead of adding major new features.

- Improve onboarding.
- Fix bugs.
- Improve retention.
- Watch analytics every day.
- Talk to users.
- ### Monetization preparation

  [[Monetization]] is Priority P1 and post-launch. [[epic-1121]] is the umbrella over four stage epics covering the entitlement foundation, AdMob advertising, Pro subscriptions, and paid BiteTrails.

- None of it blocks the public launch.
- It is prepared during this phase rather than after it, because store products and review, RevenueCat setup, the consent flow, and creator payout onboarding all have lead time that cannot be compressed once the decision to monetize is made.
- The ads channel can start first. It needs no purchase rails, no store products and no payout infrastructure, and only its "hide ads for Pro" child depends on the entitlement work.
- The entitlement foundation ([[epic-1122]]) also corrects a live defect: `createUserOnAuthCreate` currently writes `subscriptionTier: 1` for every new account, which would grant Pro to the entire user base on the first release that enforces a gate.
- ## Strategic Rule

  After launch, resist adding major new features until the product has enough real usage signals to show what people actually value.

- ## Related Pages
- [[Mission]]
- [[Current State - Known Issues]]
- [[Current State - Release State]]
- [[Current State - Nx And Dependency Migration Roadmap]]
- [[Architecture - Analytics]]
- [[Architecture - Firebase]]

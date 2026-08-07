# Current State - Release State

## Purpose

Release state summarizes where BiteTribe stands on the path to launch.

## Baseline

Roadmap baseline date: 26 June 2026.

Target launch window: 6 to 8 weeks from the baseline date.

Target public launch period: 3 August 2026 to 16 August 2026.

## Current Release Stage

BiteTribe is in Phase 2 (Product Intelligence) as of 25 July 2026, working toward the 31 July 2026 Release Candidate milestone.

The product is not yet in public launch mode. The launch-blocking backend work from Phase 1 is largely complete, including the onboarding assistant ([[epic-850]]). The remaining launch-critical code item is issue 933 (App Check blocking behavior before enforcement). The current focus is landing that gate and proving the recently landed backend trust, location, currency, gamification, notification, onboarding, and restaurant data-quality work in realistic testing before the release candidate.

## Next Milestones

| Milestone                              | Target Date              | State   |
| -------------------------------------- | ------------------------ | ------- |
| Launch-blocking backend work completed | 17 July 2026             | Planned |
| Release Candidate ready                | 31 July 2026             | Planned |
| Soft launch                            | Week of 3 August 2026    | Planned |
| Public launch                          | Week of 10 August 2026   | Planned |
| Learning phase                         | August to September 2026 | Planned |

## Recent Completed Work

- Epic 850 landed the blocking onboarding assistant, must-dismiss feature coach marks, and the onboarding funnel analytics (issue 850 closed 17 July 2026, all nine sub-issues complete).
- Issue 908 hardened Firebase App Check (verified request-ratio monitoring and remaining fixes) toward enforcement.
- Issue 933 added the enforced-mode App Check startup gate: a token preflight, blocking behavior, and a full-screen retry gate, gated by the `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` flag (off by default). Enabling Console enforcement and device validation remain the operational go-live step.
- Issue 927 addressed intermittent Bite photo upload failures so a posted Bite is not left silently without its intended photo.
- Issue 967 added client-side suspicious price validation.
- Issue 909 / PR \#965 added location-based currency prefill for Bite creation.
- Issue 974 added city search through backend search functions and search UI wiring.
- Issue 966 added weekly Bite count resync for leaderboard/profile aggregate repair.
- Issue 968 persisted leaderboard ranking/contribution display behavior.
- Issue 971 added daily ranking-change notifications.
- Issue 975 added profile country badges and supporting country-code derivation.
- Issue 942 added Business app restaurant candidate verification into real Restaurants.
- Issue 943 / PR \#981 replaced direct Bite place text entry with required restaurant/place selection before saving.
- Issue 902 was closed as obsolete after issue 943 because selected places already patch the Bite position when a trusted place position is available.
- Issue 982 fixed map camera jumps when live Bite marker updates arrive.
- Issue 983 replaced the consumer E2E baseline with Playwright login, registration, and create-Bite coverage.
- Issue 812 replaced the tried-out checkbox in the Bucket List detail view with a swipe-to-tick gesture on the Bite card and added a first-visit coach mark for it. It also fixed the tried-out status never reaching the cached Bucket List: the reducer now applies the change optimistically, and the reload after a successful write is no longer filtered out, so the list stopped needing a re-entry to show the tick.

## Release Readiness Checklist

- Firebase App Check verified request ratio monitored.
- Remaining App Check issues fixed.
- App Check enforcement enabled.
- Bite location enriched with Google Places.
- City search backed by enriched Bite location data implemented.
- Location-based Bite currency prefill implemented.
- Client-side suspicious price validation implemented.
- Currency prefill fallback and manual override tested.
- Leaderboard aggregate resync implemented.
- Ranking-change notifications implemented and device-tested.
- Profile badges implemented.
- Restaurant candidate verification implemented and emulator-tested.
- Mandatory restaurant/place picker implemented for Bite creation.
- Map camera remains stable when new Bites arrive through live updates.
- Playwright E2E smoke coverage exists for login, registration, and create Bite.
- Blocking onboarding assistant, feature coach marks, and onboarding funnel analytics implemented (epic 850).
- App Check startup failure switched to blocking behavior before Console enforcement (issue 933).
- Edge cases tested:
  - vacation usage
  - posting later
  - missing location
- Firebase Analytics events defined.
- Firebase Analytics implemented.
- Analytics verified in DebugView.
- Key metrics dashboard created.
- Android testing completed.
- iOS testing completed.
- Web testing completed.
- Phases 0 to 2 of the Nx and dependency migration roadmap completed with their validation gates, without making Angular 22 an artificial launch prerequisite.
- Cypress removed after required E2E scenarios are represented in Playwright.
- Visual regression runs directly through `oblador/loki` without the `nx-loki` adapter.
- Remaining launch blockers fixed.
- App Store assets prepared.
- Google Play assets prepared.
- App Store Connect export compliance revisited for public launch. Weekly builds currently answer **No** to French distribution because BiteTribe is not live; that answer must be corrected before France is in scope. Declaring `ITSAppUsesNonExemptEncryption` in the iOS `Info.plist` removes the per-build prompt entirely. See [[Implementation - Store Release Steps]].
- Crashlytics and Analytics monitoring plan active for soft launch.

## Launch Rule

Before public launch, the release should be stable enough to learn from real users without confusing technical failures with product feedback.

## Related Pages

- [[Current State - Roadmap]]
- [[Current State - Known Issues]]
- [[Current State - Open Questions]]
- [[Current State - Release Candidate Test Charter]]
- [[Implementation - Release And Build Workflow]]
- [[Current State - Nx And Dependency Migration Roadmap]]

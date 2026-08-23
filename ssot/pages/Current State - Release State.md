# Current State - Release State

## Purpose

Release state summarizes where BiteTribe stands on the path to launch.

## Baseline

Roadmap baseline date: 26 June 2026.

Target launch window: 6 to 8 weeks from the baseline date.

Target public launch period: 3 August 2026 to 16 August 2026.

## Current Release Stage

BiteTribe is completing Phase 2 (Product Intelligence) as of 19 August 2026. The original Phase 3 window of 3 to 16 August 2026 passed without a release candidate and is recorded below as missed rather than quietly rewritten.

The product is not yet in public launch mode. All launch-blocking **code** work is complete: Phase 1's backend work, the onboarding assistant ([[epic-850]]), and the enforced-mode App Check startup gate from issue 933, which landed and is now switched on for the release candidate. What remains is not implementation but proof and paperwork.

Three things stand between here and a release candidate:

- **The platform test pass ([issue 1176](https://github.com/muhammedgaygisiz/travellers-apps/issues/1176)) is incomplete.** The web half passed at Run 8 and the iOS half at Run 7, each against a named build. **Android has never been executed in any of the eight runs** and its device-matrix rows are empty. The artifact half of that blocker cleared on 23 August 2026: build 95 was released to TestFlight and Google Play Open Testing, replacing the build 87 the Android track had carried since 26 July. Nothing has been executed against it yet, so the run itself is still outstanding, but it is now waiting on someone rather than on a distributable build. Notification delivery, a Crashlytics non-fatal from Android, and DebugView from a physical device remain unverified on every platform. The enforced App Check gate (charter check 12) is also unverified, but for the first time it is **exercisable**: build 95 is the first artifact built with `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true`, so the client-side gate can be recorded as passed or failed instead of not applicable.
- **Store assets ([issue 1178](https://github.com/muhammedgaygisiz/travellers-apps/issues/1178)) do not exist at all.** No `docs/store`, no fastlane, no screenshots, no listing copy, and neither privacy declaration. This is the longest lead-time item and does not depend on the test pass, so it runs in parallel.
- **[Issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177) is settled except for device verification.** Every decision in it is made and recorded: issue 952 deferred, issue 978 closed, Angular 22 out of scope, the Nx gates met, the debug token rotated, and both rules gaps accepted. Its one open acceptance criterion is App Check enforcement verified against real traffic on all three platforms, which is charter check 12 and therefore blocked on issue 1176.

## Next Milestones

Revised on 19 August 2026. The original targets are kept alongside the new ones, because a schedule that quietly forgets it slipped teaches nothing the next time.

| Milestone                              | Original Target          | Revised Target            | State                                            |
| -------------------------------------- | ------------------------ | ------------------------- | ------------------------------------------------ |
| Launch-blocking backend work completed | 17 July 2026             | Met, late                 | Done. All launch-blocking code has landed        |
| Release Candidate ready                | 31 July 2026             | 2 September 2026          | In progress. Blocked on Android and store assets |
| Soft launch                            | Week of 3 August 2026    | Week of 7 September 2026  | Missed original window                           |
| Public launch                          | Week of 10 August 2026   | Week of 14 September 2026 | Missed original window                           |
| Learning phase                         | August to September 2026 | September to October 2026 | Follows public launch                            |

The revised dates are derived rather than chosen, and the derivation is what to argue with if they look wrong:

- **Android needs a distributed artifact before it can start. Met on 23 August 2026.** The estimate said a build would reach the Play track by around 22 August and it arrived on the 23rd, so this step cost what it was budgeted. It was build 95 rather than the build 96 predicted here: the estimate was written while `develop` carried 95 and assumed the release would be cut after another bump, but the Sunday release published the build `develop` was already on. Everything downstream of this bullet still assumes the run starts promptly; the artifact no longer blocks it.
- **Expect the first Android run to find things.** Every first run on a platform has: Run 3 opened six `P0` defects, and Runs 7 and 8 each found more. At the observed cadence of one run every two to three days including fix time, budget two to three Android iterations, landing around 29 August to 1 September.
- **Store assets are the parallel long pole.** Screenshots at every required size from seeded realistic data, listing copy across the shipped locales, both privacy declarations, and two console entries is one to two weeks of work starting from nothing. Running alongside the test pass, that also lands near 2 September.
- **The soft launch needs a few days after the release candidate** for the build to be cut, distributed and confirmed installable from both tracks, which puts it in the week of 7 September.
- **The gap from soft to public launch stays one week**, unchanged from the original plan.

These assume the Android pass finds nothing that needs a substantial fix. A single `P0` of the kind Run 6 hit with issue 1308 moves everything downstream by roughly a week.

## Recent Completed Work

- Build 95 was released on 23 August 2026 and is the first artifact built with `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true`, so the client-side enforced-mode gate is finally exercisable on a distributed build. Tag `build-1.0.1-95`, native sources built from `c187b984`, uploaded to TestFlight and submitted for external beta review, and to Google Play Open Testing where it replaced build 87 from 26 July. The release also closed a documentation gap that had been costing every release the same failure: the release path prescribed `nx run bite-tribe-ios:sync` directly, while the UTF-8 remedy already existed as `npm run cap:sync:ios`, and Release Workflow step 2 showed a bare production build that silently ships the enforced gate disabled. See [[Release Workflow]] and [[Architecture - Capacitor]].
- Issue 1177 settled the remaining release-candidate decisions on 19 August 2026: issue 952 (App Check replay protection) deferred to the monetization work because only `deleteOwnAccount` of its candidate functions exists today; issue 978 closed after its last uncovered bullet gained a currency re-resolution assertion; Angular 22 (issue 1037) confirmed out of scope; the Nx migration gates confirmed met through Phase 3; the burned App Check debug token deleted from all three apps with no replacement issued; and the open `firestore.rules` and `storage.rules` authorization gaps accepted as documented launch risks, the Storage half filed as [issue 1350](https://github.com/muhammedgaygisiz/travellers-apps/issues/1350) because it previously had no owning issue.
- The enforced-mode App Check gate was switched on for the release candidate: `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` is now set on the `deploy-bite-tribe` job and in the charter's local build procedure. It had been set nowhere, so every artifact up to that point shipped the gate off, including the CI web deploy of build 95. Read "build 95" here as that web artifact, not as the native build 95 released on 23 August, which is the first artifact to carry the gate on.
- Epic 850 landed the blocking onboarding assistant, must-dismiss feature coach marks, and the onboarding funnel analytics (issue 850 closed 17 July 2026, all nine sub-issues complete).
- Issue 908 hardened Firebase App Check (verified request-ratio monitoring and remaining fixes) toward enforcement.
- Issue 933 added the enforced-mode App Check startup gate: a token preflight, blocking behavior, and a full-screen retry gate, gated by the `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` flag, which defaulted to off. Superseded on 19 August 2026: Console enforcement turned out to have been active for Firestore, Storage and Authentication since before Run 4, and the flag is now set for the release candidate. Device validation is the only part of this that is still outstanding, as charter check 12.
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
- App Check enforcement enabled. **Server-side enforcement has been active** for Firestore, Storage and Authentication since before Run 4; Places API (New) stays in Monitoring by decision under [issue 1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245). The **client-side enforced-mode gate is on for the release candidate** by decision under [issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177) and is now set on the `deploy-bite-tribe` job and in the charter's local build procedure. Device validation is charter check 12 under [issue 1176](https://github.com/muhammedgaygisiz/travellers-apps/issues/1176) and is still unexecuted on every platform, but is no longer blocked: build 95, released 23 August 2026, is the first distributed artifact carrying the flag, so the check can now return a real result rather than not applicable.
- Bite location enriched with Google Places.
- City search backed by enriched Bite location data implemented.
- Location-based Bite currency prefill implemented.
- Client-side suspicious price validation implemented.
- Currency prefill fallback and manual override tested. Covered by Playwright in `bite-data-quality.spec.ts`, plus a currency re-resolution assertion added to the geotagged test in `create-and-edit-bite.spec.ts`. [Issue 978](https://github.com/muhammedgaygisiz/travellers-apps/issues/978) closed 19 August 2026; the remaining native device proof is charter check 4 under [issue 1176](https://github.com/muhammedgaygisiz/travellers-apps/issues/1176).
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
- Phases 0 to 2 of the Nx and dependency migration roadmap completed with their validation gates, without making Angular 22 an artificial launch prerequisite. **Met, and Phase 3 is complete as well.** Phase 0 through [issue 1030](https://github.com/muhammedgaygisiz/travellers-apps/issues/1030), [issue 1032](https://github.com/muhammedgaygisiz/travellers-apps/issues/1032) and [issue 1040](https://github.com/muhammedgaygisiz/travellers-apps/issues/1040); Phase 1 through [issue 1035](https://github.com/muhammedgaygisiz/travellers-apps/issues/1035); Phase 2 through [issue 1033](https://github.com/muhammedgaygisiz/travellers-apps/issues/1033), which put `nx`, every official `@nx/*` package and `@nxext/capacitor` on a single Nx 23 generation; Phase 3 through [issue 1031](https://github.com/muhammedgaygisiz/travellers-apps/issues/1031) and [issue 1036](https://github.com/muhammedgaygisiz/travellers-apps/issues/1036). Only Phase 4 remains, which is Angular 22 ([issue 1037](https://github.com/muhammedgaygisiz/travellers-apps/issues/1037)) and **stays out of release-candidate scope** by decision under [issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177), consistent with [[Current State - Roadmap]].
- Cypress removed after required E2E scenarios are represented in Playwright. **Done** through [issue 1032](https://github.com/muhammedgaygisiz/travellers-apps/issues/1032). The `CYPRESS_PASSWORD` and `CYPRESS_USER_NAME` repository secrets outlived it and were deleted on 19 August 2026; nothing in `.github/` or the repository referenced them.
- Visual regression runs directly through `oblador/loki` without the `nx-loki` adapter. **Done** through [issue 1040](https://github.com/muhammedgaygisiz/travellers-apps/issues/1040).
- Remaining launch blockers fixed.
- App Store assets prepared.
- Google Play assets prepared.
- App Store Connect export compliance revisited for public launch. `ITSAppUsesNonExemptEncryption` is declared `false` in the iOS `Info.plist` from build 93 onward, which removed the per-build prompt and the France question with it. Apple no longer asks, but France's own encryption rules still apply on their own terms. **Decided on 21 August 2026: France is in distribution scope on both stores.** The reasoning is the same profile that justifies the `false` declaration — no cryptography dependency in the workspace, no proprietary crypto in either wrapper, and all encryption is HTTPS/TLS supplied by the operating system and the Firebase SDKs, which is the case France's declaration regime is least likely to reach. The decision also reconciles the two stores rather than leaving them contradictory: Play's open testing has targeted France since before this item was written, so excluding France on Apple alone would have been inconsistent without being safer. Revisit if BiteTribe ever ships its own cryptography, which is the same trigger that would force `ITSAppUsesNonExemptEncryption` to `true`. See [[Implementation - Store Release Steps]] and [[Implementation - Store Listing Assets]].
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

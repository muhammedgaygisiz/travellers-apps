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

Where the three release-candidate gates stand. Two of them closed on 29 August 2026, and **store assets are now the only thing between here and a release candidate**:

- **The platform test pass ([issue 1176](https://github.com/muhammedgaygisiz/travellers-apps/issues/1176)) passed on all three platforms and was closed out on 29 August 2026.** It passed on three separate builds rather than one, which the maintainer accepted rather than re-running web and iOS. Android passed at **Run 11 on 29 August 2026**, against a locally built debug 1.0.1 (96) from `develop` at `68f8626e`, on a physical Samsung SM-A566B running Android 16. Run 10, earlier the same day at `78889774`, cleared all eleven Run 9 findings, [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385) to [#1395](https://github.com/muhammedgaygisiz/travellers-apps/issues/1395), including the account-deletion blocker that stopped Run 9, and executed charter check 12 in full for the first time in this charter's history. It opened one new `P0`, [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414), where a gallery photo lost its GPS after the `@capawesome/capacitor-file-picker` swap to the Android Photo Picker. Run 11 verified that `P0` fixed four independent ways against a byte-identical fixture, verified the other closed Run 10 findings on hardware, and filed three findings that do not block a release candidate: [#1426](https://github.com/muhammedgaygisiz/travellers-apps/issues/1426) `P3`, [#1427](https://github.com/muhammedgaygisiz/travellers-apps/issues/1427) `P3`, and [#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428) `P2`. All thirteen checks are recorded, with checks 2, 6, 7, 9 and 10 passing in full for the first time.

  What that does not mean is that one artifact has been proven everywhere. The web half passed at Run 8 on 17 August 2026 against `develop` at `a20f485a`, and the iOS half at Run 7 on 15 August 2026 against TestFlight build 94 at `4fdf021d`. Those are 35 and 45 commits behind `develop` and both predate the Angular 22 / NgRx 22 / TypeScript 6 upgrade in `d7e45edd`, which is the reason Android was re-run as Run 10 rather than resting on Run 9. **Accepted on 29 August 2026**: three per-platform passes stand in for one artifact proven on all three, and the residual risk is written down rather than retired. [Issue 1355](https://github.com/muhammedgaygisiz/travellers-apps/issues/1355), which existed to re-execute web and iOS, has nothing left to execute.

  Four checks were accepted as gaps rather than executed, each against named substitute evidence, and all of them are listed in [[Current State - Release Candidate Test Charter]] under Accepted Gaps. **Check 12 on web and iOS**: executed on Android only; the enforced build is delivered on both other platforms and no attestation failure has surfaced in the field, though the refused-token retry gate stays unproven outside Android. **Ranking-change notification delivery**: never forced, because the function is scheduled and would push to every real user whose rank changed; users have reported receiving these notifications and push transport is proven on both platforms by the new-follower path. **iOS Analytics DebugView**: iOS is verified through GA4 Realtime instead. **Edge cases**: partially covered, with no real currency-boundary trip. The **business app** is out of scope for this release candidate by decision and gets its own soft launch, and **Android deep-link OS auto-verification** moves to [#1179](https://github.com/muhammedgaygisiz/travellers-apps/issues/1179), since a store-signed artifact resolves it.

- **Store assets ([issue 1178](https://github.com/muhammedgaygisiz/travellers-apps/issues/1178)) are underway and are now the only gate.** They started from zero and are no longer there. [[Implementation - Store Listing Assets]] holds the decided identity, the listing copy, the capture rules and the captured set, the declarations, and a per-slot inventory of both consoles as of 21 to 22 August 2026. It lives in the SSOT rather than a `docs/store` directory, by decision: `docs/` is legacy and no new documentation goes there.

  What is filled: Play's default listing is live with name, both descriptions, icon, a current-palette feature graphic and five phone screenshots, and all ten of Play's app-content declarations are complete. App Store Connect has name, subtitle, age rating, description, promotional text, keywords, category, pricing, content rights and a published App Privacy entry, and TestFlight is in good shape with both tester groups and a filled beta description.

  What is not: Play has no tablet screenshots of either size and an empty website and phone number; App Store Connect has 5 of 10 screenshots, no app previews, no attached build, and an **empty support URL, which is required** - that one is blocked on the same mailbox as [#1429](https://github.com/muhammedgaygisiz/travellers-apps/issues/1429). Apple's privacy nutrition labels are not started. See [[Implementation - Store Listing Assets]] for the per-slot state and [[Implementation - Store Release Steps]] for the console procedure.

- **[Issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177) is settled, its last acceptance criterion closed by decision on 29 August 2026.** Every decision in it is made and recorded: issue 952 deferred, issue 978 closed, Angular 22 out of scope - a decision the upgrade in `d7e45edd` has since overtaken - the Nx gates met, the debug token rotated, and both rules gaps accepted. Its one open acceptance criterion is App Check enforcement verified against real traffic on all three platforms, which is charter check 12. **Android now satisfies it in full**: Run 10 executed both halves for the first time, and Run 11 reached the refused-token gate a second time by deleting only the App Check token cache while leaving the debug secret registered, which is the repeatable way to exercise it on a device. Web and iOS were **accepted as gaps on 29 August 2026** rather than executed: the enforced build is delivered on both, and no attestation failure has surfaced in the field. The criterion is closed by that decision rather than by a run, and the refused-token retry gate remains unproven outside Android.

## Next Milestones

Revised on 19 August 2026. The original targets are kept alongside the new ones, because a schedule that quietly forgets it slipped teaches nothing the next time.

| Milestone                              | Original Target          | Revised Target            | State                                                                |
| -------------------------------------- | ------------------------ | ------------------------- | -------------------------------------------------------------------- |
| Launch-blocking backend work completed | 17 July 2026             | Met, late                 | Done. All launch-blocking code has landed                            |
| Release Candidate ready                | 31 July 2026             | 2 September 2026          | In progress. Platform test pass closed; blocked on store assets only |
| Soft launch                            | Week of 3 August 2026    | Week of 7 September 2026  | Missed original window                                               |
| Public launch                          | Week of 10 August 2026   | Week of 14 September 2026 | Missed original window                                               |
| Learning phase                         | August to September 2026 | September to October 2026 | Follows public launch                                                |

The revised dates are derived rather than chosen, and the derivation is what to argue with if they look wrong:

- **Android needs a distributed artifact before it can start. Met on 23 August 2026.** The estimate said a build would reach the Play track by around 22 August and it arrived on the 23rd, so this step cost what it was budgeted. It was build 95 rather than the build 96 predicted here: the estimate was written while `develop` carried 95 and assumed the release would be cut after another bump, but the Sunday release published the build `develop` was already on. Everything downstream of this bullet still assumes the run starts promptly; the artifact no longer blocks it.
- **Expect the first Android run to find things.** Every first run on a platform has: Run 3 opened six `P0` defects, and Runs 7 and 8 each found more. At the observed cadence of one run every two to three days including fix time, budget two to three Android iterations, landing around 29 August to 1 September. **Met at the optimistic end.** It took three - Run 9 on 27 August, then Runs 10 and 11 on 29 August - and the Android half passed on 29 August, the first day of the window. Runs 10 and 11 ran on the same day because Run 10 was stopped by decision once its regression sweep was complete, not because the cadence improved.
- **Store assets are the parallel long pole.** Screenshots at every required size from seeded realistic data, listing copy across the shipped locales, both privacy declarations, and two console entries is one to two weeks of work starting from nothing. Running alongside the test pass, that also lands near 2 September.
- **The soft launch needs a few days after the release candidate** for the build to be cut, distributed and confirmed installable from both tracks, which puts it in the week of 7 September.
- **The gap from soft to public launch stays one week**, unchanged from the original plan.

These assume the Android pass finds nothing that needs a substantial fix. A single `P0` of the kind Run 6 hit with issue 1308 moves everything downstream by roughly a week.

## Recent Completed Work

- The Android half of the platform test pass passed on 29 August 2026, after three executions. Run 9 on 27 August failed on [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385) and filed eleven findings; Run 10 verified all eleven, cleared the deletion blocker, executed charter check 12 in full for the first time, and opened [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414); Run 11 verified [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414) fixed four independent ways and closed the run out with three non-blocking findings. Runs 10 and 11 used a locally built debug 1.0.1 (96) rather than the store artifact, because 19 commits including the Angular 22 upgrade had never run on hardware; the reasoning and its cost are recorded in [[Current State - Release Candidate Test Charter]].
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
- Edge cases tested. **Partially, and accepted as such on 29 August 2026.** Run 8 reached the vacation and posting-later shape on web through the position-source modal's `Set manually` option, which is how it found [#1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307); Run 11 covered the missing-location branch on Android through permission denial. Neither the full class of cases nor a real currency-boundary trip has been exercised:
  - vacation usage
  - posting later
  - missing location
- Firebase Analytics events defined.
- Firebase Analytics implemented.
- Analytics verified in DebugView. **Done on Android; accepted as a gap on iOS.** Android verified at Run 10 after [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387): `measurement_enabled_from_api=true` is persisted and DebugView showed 48 events in thirty minutes from the physical device. iOS stays Realtime-only: DebugView needs a dedicated Xcode debug-mode launch and would confirm a transport that runs 4, 6 and 7 already proved, so it is an accepted gap.
- Key metrics dashboard created. **Confirmed on 29 August 2026.** It is dashboard-as-code rather than a console dashboard, because GA4 has no API to create one: the nine launch tiles live in `tools/analytics/dashboard.config.mjs` and `.github/workflows/analytics-digest.yml` posts a daily digest to [#991](https://github.com/muhammedgaygisiz/travellers-apps/issues/991). The 29 August run reported 144 restaurant and Bite views per day, 38 daily active users and 5 Bites per day from GA4 property `487035057`, and raised its own alert on sign-ups at zero. D1/D7 retention and crash-free users stay console-only until [#986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986) lands BigQuery.
- Android testing completed. **Done. Passed at Run 11 on 29 August 2026** against a locally built debug 1.0.1 (96) from `develop` at `68f8626e`, on a physical Samsung SM-A566B running Android 16. Run 9 (27 August, Play build 95) failed on [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385) and Run 10 failed on [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414); both are verified fixed on hardware. Ranking-change notification delivery and deep-link OS auto-verification are accepted gaps rather than passes; both reasons are in the charter.
- iOS testing completed. **Done. Passed at Run 7 on 15 August 2026** against TestFlight build 94. That artifact is 45 commits behind `develop` and predates the Angular 22 upgrade, and it shipped `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` off, so charter check 12's client gate was never exercisable there. Not re-executed, by decision.
- Web testing completed. **Done. Passed at Run 8 on 17 August 2026** against `develop` at `a20f485a`, with both Playwright suites executed serially for the first time. 35 commits behind `develop` and likewise pre-Angular 22. Not re-executed, by decision.
- Phases 0 to 2 of the Nx and dependency migration roadmap completed with their validation gates, without making Angular 22 an artificial launch prerequisite. **Met, and Phase 3 is complete as well.** Phase 0 through [issue 1030](https://github.com/muhammedgaygisiz/travellers-apps/issues/1030), [issue 1032](https://github.com/muhammedgaygisiz/travellers-apps/issues/1032) and [issue 1040](https://github.com/muhammedgaygisiz/travellers-apps/issues/1040); Phase 1 through [issue 1035](https://github.com/muhammedgaygisiz/travellers-apps/issues/1035); Phase 2 through [issue 1033](https://github.com/muhammedgaygisiz/travellers-apps/issues/1033), which put `nx`, every official `@nx/*` package and `@nxext/capacitor` on a single Nx 23 generation; Phase 3 through [issue 1031](https://github.com/muhammedgaygisiz/travellers-apps/issues/1031) and [issue 1036](https://github.com/muhammedgaygisiz/travellers-apps/issues/1036). Phase 4, Angular 22 ([issue 1037](https://github.com/muhammedgaygisiz/travellers-apps/issues/1037)), was declared **out of release-candidate scope** by decision under [issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177) on 19 August 2026 and then **landed anyway** in `d7e45edd`, which upgraded Angular and NgRx to 22 with TypeScript 6. The roadmap is therefore complete through Phase 4, but the decision is what makes the older platform results stale: every run before Run 10 exercised a pre-Angular-22 artifact, and that is the reason Android was re-run rather than resting on Run 9, and the reason web and iOS are re-executed under Run 12.
- Cypress removed after required E2E scenarios are represented in Playwright. **Done** through [issue 1032](https://github.com/muhammedgaygisiz/travellers-apps/issues/1032). The `CYPRESS_PASSWORD` and `CYPRESS_USER_NAME` repository secrets outlived it and were deleted on 19 August 2026; nothing in `.github/` or the repository referenced them.
- Visual regression runs directly through `oblador/loki` without the `nx-loki` adapter. **Done** through [issue 1040](https://github.com/muhammedgaygisiz/travellers-apps/issues/1040).
- Remaining launch blockers fixed. **Decided on 29 August 2026.** [#1381](https://github.com/muhammedgaygisiz/travellers-apps/issues/1381) (restaurant page loading state and menu-button gating), [#1366](https://github.com/muhammedgaygisiz/travellers-apps/issues/1366) (ungrouped Android FCM backlog) and [#1402](https://github.com/muhammedgaygisiz/travellers-apps/issues/1402) (obsolete web update modals) were moved from `P0` to `P1` and deferred out of the release candidate. [#1429](https://github.com/muhammedgaygisiz/travellers-apps/issues/1429) - the privacy policy and deletion page now name a `support@bitetribe.app` mailbox that does not exist yet - is **not** a release-candidate blocker, but the alias must be live before the store listings go in for review, so it runs alongside [issue 1178](https://github.com/muhammedgaygisiz/travellers-apps/issues/1178).
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

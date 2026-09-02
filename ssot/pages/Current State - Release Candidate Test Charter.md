# Current State - Release Candidate Test Charter

## Purpose

This charter defines the platform test pass that has to be executed before the release candidate is cut. It exists so that "Android, iOS and web tested" on the readiness checklist in [[Current State - Release State]] means a recorded run against a named build, on named devices, with a named result, instead of an informal click-through.

It covers issue 1176 and belongs to issue 911 under [[epic-907]].

## Build Under Test

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| App identifier        | `com.bitetribe.app`                                                    |
| Marketing version     | 1.0.1                                                                  |
| Build number          | 96, source commit `68f8626e`, no tag - locally built, see below        |
| Configuration         | Production configuration, produced as described below                  |
| Backend               | Production Firebase project, not the emulator                          |
| App Check             | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` **on** in the build 96 artifact |
| Android minimum SDK   | 24                                                                     |
| iOS deployment target | 15.6                                                                   |

The App Check row has changed meaning twice. Build 94 shipped the flag **off**, so its client-side enforced-mode gate is recorded as not applicable rather than passed, and that is still the newest iOS artifact any run has exercised. Build 95 was the first artifact built with the flag on. The build 96 rows above describe runs 10 and 11: a locally built **debug** APK, not a store artifact, produced from a production web bundle carrying `` `ENFORCED:"true"` ``. The debug variant was chosen deliberately - `apps/bite-tribe-android/android/app/build.gradle` adds `firebase-appcheck-debug` to that variant only, so the gate can be made to fail attestation on demand, which is how check 12's refused-token half was finally executed. Version 1.0.1 (96) covers both runs 10 and 11 with the same `versionCode`, so on Android the **source commit is the only build discriminator**: `78889774` for run 10 and `68f8626e` for run 11.

This says nothing about backend protection: Firebase Console enforcement is a separate, server-side switch that is active for Firestore, Storage and Authentication, so protected reads and writes are verified traffic regardless of the client flag. Record the actual version, build number and commit SHA used for every run, because the numbers above change with every build increment and, on Android, sometimes do not change when the code does.

## How To Produce The Build

`pipeline.yml` has no native job. CI runs setup, lint, stylelint, tests, loki, e2e, the two web app builds and deploys, and the Storybook deploy, and nothing in it touches Capacitor, Gradle or Xcode.

A separate workflow, `.github/workflows/native-release.yml`, now does under [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181). It has never run - its signing secrets are not provisioned - so there is still no CI-built Android or iOS artifact to test, and every step below stands. Re-read this section once a run has produced installable artifacts.

The release-candidate pass must use the same distribution route as testers:

- iOS uses the named TestFlight build.
- Android uses the named Google Play Open Testing release.
- Web uses the deployed production-configuration build.

The native wrappers bundle `dist/apps/bite-tribe`. Producing the store artifacts starts from a local production build, whose safety comes from the production configuration plus an explicit check:

1. `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production --skip-nx-cache`. The enforced-mode gate from issue 933 is **on for the release candidate**, decided under [issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177). The variable defaults to off and nothing in a local build sets it, so a build produced without it silently ships the gate disabled while every other part of this charter still reads as if it were on. CI sets the same variable on the `deploy-bite-tribe` job, so the web deploy and the native wrappers agree. `--skip-nx-cache` is not belt-and-braces. The variable is **not part of the build target's cache key**, so the command above, written correctly and run with the variable set, still returns a cached bundle carrying `` `ENFORCED:"false"` `` if one exists. Run 11 hit exactly that, and only step 3's grep caught it. See [#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428).
2. Confirm the bundle is clean before it is wrapped. `npm run release:verify-bundle` does checks 2 and 3 together and exits non-zero on either. The environment plugin strips `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` and `NX_APP_BITE_TRIBE_IS_DEV` only when `NX_TASK_TARGET_CONFIGURATION` is `production`, so a build made through any other path keeps them. By hand, in `dist/apps/bite-tribe`, grep for the debug token's own value, and for `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:` and `NX_APP_BITE_TRIBE_IS_DEV:` — **with the trailing colon** — and expect no match.

   The colon is what makes this check mean anything. Grepping the bare key name always matches even in a correctly stripped bundle, because the app source declares those names as lookup constants and the minifier keeps them as plain strings: a clean production build contains `q="NX_APP_BITE_TRIBE_IS_DEV"` in the App Check chunk. Only the property form proves a **value** was inlined. Checking without the colon reports every build as contaminated, which is worse than not checking, because it trains the reader to wave the result through.

3. Confirm the gate actually reached the bundle. The plugin replaces `process.env` wholesale with the collected object, so the inlined entries land in the emitted JavaScript as object properties. Grep `dist/apps/bite-tribe` for `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:` followed by a quoted `true`, and expect a match. This is the build-time half of check 12; the device evidence is the runtime half, and neither substitutes for the other.

   **Do not pin the quoting.** The key is unquoted — esbuild minifies the define object with bare identifier keys, so the JSON-shaped `"NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED":"true"` matches nothing — but the _value_ is not reliably double-quoted either. The build of commit `297f8be4` emits `` NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:`true` `` as a template literal, on which the double-quoted grep this step used to prescribe returns no match for a bundle that is entirely correct. A check whose expected-match half silently never matches trains the reader to wave the result through, which is the same failure mode as grepping without the colon. `npm run release:verify-bundle` accepts all three quote forms and is the reason to prefer it.

4. `npx nx run bite-tribe-ios:sync` and `npx nx run bite-tribe-android:sync`. Use the `run <project>:sync` form: `nx sync` on its own is Nx's built-in workspace sync-generator command, which ignores a project argument and never touches Capacitor.
5. Archive/upload from Xcode and Android Studio, distribute through TestFlight and Google Play Open Testing, and test the resulting store-installed artifacts. The console procedure is [[Implementation - Store Release Steps]].

Step 2 is not optional. A registered debug token bypasses App Check entirely, which would defeat the enforced-mode gate this pass is meant to verify.

Until issue #1181 lands, every native release artifact is produced manually on a workstation. The explicit production-bundle check makes that acceptable for this release-candidate pass, but it does not make the process reproducible: the store artifact is not automatically tied to a commit, shared toolchain, signing job, or retained CI output. Record the source commit, local toolchain, signing route, and store upload manually for every tested native build.

Web verification against the emulator is a preparation step, not the pass. The web half of the pass runs against a production-configuration build.

## Store Distribution Baseline

The first execution session found that the store artifacts still carried build 87 while the charter and current wrappers expected build 88. These records identify the old baseline; they are not the final release-candidate artifacts.

| Platform | Distribution          | Version    | Status                                             | Store timestamp              |
| -------- | --------------------- | ---------- | -------------------------------------------------- | ---------------------------- |
| iOS      | TestFlight            | 1.0.1 (87) | Testing; internal and external tester groups       | Uploaded 26 July 2026, 18:13 |
| Android  | Google Play Open Test | 1.0.1 (87) | Available to testers; full rollout, 12/177 regions | Released 26 July 2026, 19:00 |

Build 87 predates the failed-photo state and retry workflow delivered in commit `691fab5e`. Build 88 or newer must be distributed before the release-candidate pass can be completed. Record the exact commit SHA used to produce that replacement artifact; the store consoles do not expose it.

## Device Matrix

Fill in the actual hardware during execution. The minimum is one physical device per native platform; simulators and emulators do not count for permissions, notifications, camera or App Check.

| Platform | Device                        | OS version  | Physical or virtual | Notes                                                   |
| -------- | ----------------------------- | ----------- | ------------------- | ------------------------------------------------------- |
| iOS      | iPhone 12 mini                | 26.6        | Physical            | Newest iOS execution is run 7 on TestFlight build 94    |
| iOS      |                               |             | Simulator           | Optional second OS version                              |
| Android  | Samsung SM-A566B (Galaxy A56) | 16 (SDK 36) | Physical            | Play build 95 for run 9; local debug 96 for runs 10, 11 |
| Android  |                               |             | Emulator            | Optional older API level                                |
| Web      | MacBook                       | macOS       | Chrome              | Runs 7 and 8 executed in Chrome; Safari never exercised |

Cover the oldest supported OS if a device is available. The lowest supported levels are Android API 24 and iOS 15.6, and neither has ever been exercised deliberately.

## Test Data And Accounts

- One fresh account registered during the pass, used for the onboarding and first-run checks.
- One established account with Bites, followers, a bucket list and a leaderboard position.
- One account on the business app if the business checks are executed.
- Record which account was used for which check, since several defects only appear on a first-run account.

## Web

1. Run the full Playwright suites serially, one after the other, with `npx nx e2e bite-tribe-e2e --workers=1` and `npx nx e2e bite-tribe-business-e2e --workers=1`. They share the emulator ports, so never run them at once, and a parallel local run is not evidence; see [[Implementation - Testing]].
2. Repeat the critical journeys manually against a production-configuration build: registration, onboarding, login, create a Bite with a photo, Bite details, search, map, bucket list, profile, settings.
3. Check the privacy policy page and the account deletion flow.
4. Confirm no console errors and no failed network requests on the main journeys.
5. Record the **commit**, not only the version and build number. The web deploy tracks `develop` while the build number only moves at release prep, so consecutive web runs can read the same `1.0.1 (95)` from different code. Runs 7 and 8 did. Establish the commit from the served assets rather than assuming CI is current.
6. Run the web half in an ordinary Chrome profile and automate it freely from there. An instrumented browser scores badly with reCAPTCHA Enterprise and produces an App Check 403 that throttles for 24 hours; see the Run 7 methodology note below.

## Android

Install the named Google Play Open Testing artifact on a physical device, then execute:

1. Registration, the blocking onboarding assistant, and continuation to the home page.
2. Login, logout, and session restore after a cold start.
3. Create a Bite with a photo, including the upload failure state and both retry paths.
4. Location permission grant and denial, Bite currency prefill from the Bite position, and manual currency override. The account default currency suggested during onboarding is a separate check with a separate source: it is derived from the device region through the device time zone, never from the interface language, so a device whose Region and language variant disagree must still suggest the currency of the Region. See [[issue-1262]].
5. Map view, marker selection, the Bite drawer, and camera stability while live updates arrive.
6. Search for Bites, restaurants and cities.
7. Bucket list add, swipe to tick, and undo.
8. Notification permission, and delivery of a ranking-change notification. Issue 971 landed these but device delivery is still unverified.
9. Deep links into Bite details. Profiles are not shareable and have no deep link; that is the intended product scope, not a missing feature. See [[issue-1190]].
10. Privacy policy and account deletion end to end.
11. Restaurant menus and local gallery support, which have no Playwright coverage at all.
12. App Check in enforced mode: a working session, then the retry gate when the token is refused. Google Maps Platform is read separately: Places API (New) at 0% verified is the expected reading and must not be enforced, so the evidence to record is that restaurant, city, and Bite place search still work while the Firebase APIs are enforced. See [[issue-1245]].
13. Trigger the verification-mail **resend** and read the delivered `From` header and subject in the received mail, not the code that built them. Expect `BiteTribe <noreply@bitetribe.app>` and the catalog subject in the account's language; the one-word spelling landed on 2026-08-21 and only reaches a recipient once the Workspace `Send mail as` display name is updated to match, so a delivered `Bite Tribe` here means that console step is still outstanding. This is a required check rather than an optional one because Gmail rewrites `From` server-side when the delegated mailbox's `Send mail as` list does not carry the address, which happens after the function has already produced a correct header: [[issue-1265]] shipped twice and changed nothing a recipient saw, and no unit test can catch it. Read the resend mail specifically - the registration mail comes from Firebase Auth's own mailer and exercises a different sender path. See [[Implementation - Firebase Functions]].

## iOS

Execute the same thirteen checks on a physical device, plus:

14. The iOS permission prompts for photos, location and notifications, including the deny-then-enable-in-Settings path.
15. Behavior after backgrounding and returning, and after a force quit.

## Edge Cases

These are named on the readiness checklist and have never been tested explicitly:

- Vacation usage: create Bites far from the home location, across a currency boundary.
- Posting later: create a Bite for a place visited earlier, with the position no longer matching.
- Missing location: no permission, no signal, and a location that resolves to nothing usable.

The first two are reachable on web without travelling: the position-source modal's **`Set manually`** option makes the Bite position differ from the device position, which is how Run 8 reached #1307 and saw the currency prefill switch. Run 8 used it for one Bite in Verona against a device in Bern; the class of cases is still open.

## Business App

The business app has no Playwright coverage and was never exercised in any of the eleven runs.

**Decided on 29 August 2026: the business app is out of scope for this release candidate.** It gets its own soft launch later, and testing it against a consumer release candidate would prove nothing about the artifact being shipped. This is the charter's own second option taken deliberately, not a check that was quietly skipped. The business app's own pass is written when its launch is scheduled.

## Monitoring

- Confirm Crashlytics receives a report from each native platform. Note what the app actually sends: `FirebaseErrorHandlerService` calls `recordException`, which files a **non-fatal**, and it only runs on a native platform. A JavaScript error never crashes the native process, so there is no path that produces a fatal crash report from app code. Trigger an unhandled Angular error, restart the app so the report uploads, and expect it under Non-fatals rather than Crashes.
- Verify the analytics events in DebugView from a real device, not only from the web build. On Android this needs a build that carries the [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387) fix: the native collection flag persists in SharedPreferences, so a device that once ran a dev build stays silent under any earlier artifact, build 95 included. Expect the `App measurement disabled by setAnalyticsCollectionEnabled(false)` line to be gone and `Logging event` lines to follow.
- Confirm the key metrics dashboard exists and receives data. **Confirmed on 29 August 2026.** The dashboard is not a console dashboard: GA4 has no API to create one, so the nine launch tiles in [[Implementation - Analytics Events]] live as code in `tools/analytics/dashboard.config.mjs`, and `.github/workflows/analytics-digest.yml` runs `digest.mjs` daily against GA4 property `487035057` and posts the result to [#991](https://github.com/muhammedgaygisiz/travellers-apps/issues/991). The 29 August run reported 144 restaurant and Bite views, 38 active users and 5 Bites, each a total for the seven-day window rather than a daily rate - the tiles were titled "/ day" but never divided by the window, corrected on 31 August 2026, and correctly raised its own threshold alert on sign-ups at zero for the window. Two tiles stay console-only because the Data API cannot do cohorts - D1/D7 retention and crash-free users - and [#986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986) is what would close them.

## Pass Criteria

- Every check above is executed and recorded as pass, fail, or not applicable, with the reason. Where a check was deliberately not executed for the release candidate, it is recorded under Accepted Gaps below with the evidence standing in its place - never as a pass.
- No open defect that prevents registration, login, Bite creation with a photo, or app start.
- Crashlytics receives a non-fatal from each native platform, and analytics receives events from every platform.
- No crash observed on a supported OS version during the pass.

Anything else found is filed, triaged, and either fixed under issue 1177 or accepted as a known issue.

## Accepted Gaps

Decided on 29 August 2026, when the platform pass was closed out. These are checks the charter asks for that will **not** be executed before the release candidate. They are recorded here rather than left to be rediscovered, and each names the evidence that stands in its place, so a later reader can judge the substitution instead of assuming a pass.

| Gap                                           | Accepted because                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One build proven on all three platforms**   | Android passed at Run 11 on build 96, web at Run 8 on `a20f485a`, iOS at Run 7 on TestFlight build 94. The maintainer accepts three separate per-platform passes instead of one artifact proven everywhere. The residual risk is that no single artifact has been exercised end to end on all three.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Check 12 on web and iOS**                   | Executed on Android only, both halves. Web and iOS never attempted it. The enforced build is delivered on both - CI sets the flag on `deploy-bite-tribe`, and TestFlight build 95 was the first artifact carrying it - and no attestation failure has surfaced in the field, which covers the working session. **The refused-token retry gate remains unproven outside Android.**                                                                                                                                                                                                                                                                                                                               |
| **Ranking-change notification delivery**      | Never executed on either platform in eleven runs, because `sendDailyLeaderboardNotification` is scheduled and forcing it would push to every real user whose rank changed. Users have reported receiving these notifications and that they work, and push transport itself is proven on both platforms by the new-follower path.                                                                                                                                                                                                                                                                                                                                                                                |
| **iOS Analytics DebugView**                   | iOS analytics is verified through GA4 Realtime on runs 4, 6 and 7. DebugView needs a dedicated Xcode debug-mode launch and would confirm a transport that is not in doubt. Android DebugView is verified at Run 10.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Edge cases, exhaustively**                  | Partially covered: Run 8 reached the vacation and posting-later shape on web through the position-source modal's `Set manually` option, which is how it found [#1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307), and Run 11 covered missing location on Android by denying the permission. A real trip across a currency boundary is not tested.                                                                                                                                                                                                                                                                                                                                         |
| **The business app**                          | Out of scope for this release candidate by decision; it gets its own soft launch. See the Business App section above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Android deep-link OS auto-verification**    | **Resolved 30 August 2026, and the prediction held exactly.** The gap was `pm get-app-links` reporting state 1024 because the debug signature is not in the published `assetlinks.json`; the server half was verified independently and the app's own handling passed warm and cold. Against the Play-installed build 96 the same command reports `bite-tribe.web.app: verified`, and a `/s/bite/` link routes straight to `com.bitetribe.app/.MainActivity`. Recorded under [#1179](https://github.com/muhammedgaygisiz/travellers-apps/issues/1179). The lesson worth keeping: a signature-dependent check cannot be executed on a debug artifact at all, so deferring it was correct rather than convenient. |
| **Android Crashlytics `ErrorHandler` wiring** | The app is zoneless, so a thrown error from an injected `setTimeout` never reaches Angular's `ErrorHandler`. Run 10 called `recordException` directly - the same call the service makes - and the report uploaded, which proves the transport. The service's own wiring is verified on iOS, not on Android.                                                                                                                                                                                                                                                                                                                                                                                                     |

Everything else in this charter was executed and recorded. The accepted gaps do not include any check that a run attempted and failed.

## Result Log

Add one entry per platform per execution, newest first. Keep previous entries
when re-running after fixes. Each record holds the build identity, the device,
the result summary, the findings filed, and what was left unexecuted.

- 29 Aug 2026 — [[Test Run 11 - Android Build 96]]
- 29 Aug 2026 — [[Test Run 10 - Android Build 96]]
- 27 Aug 2026 — [[Test Run 09 - Android Build 95]]
- 17 Aug 2026 — [[Test Run 08 - Web Build 95]]
- 15 Aug 2026 — [[Test Run 07 - Web Build 95]]
- 15 Aug 2026 — [[Test Run 07 - iOS Build 94]]
- 10 Aug 2026 — [[Test Run 06 - iOS Build 93]]
- 8 Aug 2026 — [[Test Run 05 - iOS Build 92]]
- 6 Aug 2026 — [[Test Run 04 - iOS Build 91]]
- 4 Aug 2026 — [[Test Run 03 - iOS Build 90]]
- 3 Aug 2026 — [[Test Run 02 - iOS Build 89]]
- 28 July 2026 — [[Test Run 01 - iOS Build 87]]

Runs 01 and 02 carried no run number in the source; those two numbers are
assigned for ordering only and each page says so.

## Defect Handling

- File every defect as its own issue and link it to issue 1176.
- Mark it Priority P0 only if it blocks the release candidate against the pass criteria above.
- Fix release-candidate blockers under issue 1177, not on this branch.
- Move anything accepted into [[Current State - Known Issues]] before the release candidate is cut.

## Related Pages

- [[Current State - Release State]]
- [[Current State - Known Issues]]
- [[Current State - E2E Coverage]]
- [[Implementation - Testing]]
- [[Implementation - Release And Build Workflow]]
- [[epic-907]]
- [Issue #1181 - signed Android and iOS CI builds](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)

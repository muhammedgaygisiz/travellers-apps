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

`pipeline.yml` has no native job. CI runs setup, lint, stylelint, tests, loki, e2e, the two web app builds and deploys, and the Storybook deploy, and nothing in it touches Capacitor, Gradle or Xcode. There is therefore no CI-built Android or iOS artifact to test. [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) tracks signed, commit-traceable Android and iOS CI artifacts.

The release-candidate pass must use the same distribution route as testers:

- iOS uses the named TestFlight build.
- Android uses the named Google Play Open Testing release.
- Web uses the deployed production-configuration build.

The native wrappers bundle `dist/apps/bite-tribe`. Producing the store artifacts starts from a local production build, whose safety comes from the production configuration plus an explicit check:

1. `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production --skip-nx-cache`. The enforced-mode gate from issue 933 is **on for the release candidate**, decided under [issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177). The variable defaults to off and nothing in a local build sets it, so a build produced without it silently ships the gate disabled while every other part of this charter still reads as if it were on. CI sets the same variable on the `deploy-bite-tribe` job, so the web deploy and the native wrappers agree. `--skip-nx-cache` is not belt-and-braces. The variable is **not part of the build target's cache key**, so the command above, written correctly and run with the variable set, still returns a cached bundle carrying `` `ENFORCED:"false"` `` if one exists. Run 11 hit exactly that, and only step 3's grep caught it. See [#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428).
2. Confirm the bundle is clean before it is wrapped. The environment plugin strips `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` and `NX_APP_BITE_TRIBE_IS_DEV` only when `NX_TASK_TARGET_CONFIGURATION` is `production`, so a build made through any other path keeps them. In `dist/apps/bite-tribe`, grep for the debug token's own value, and for `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:` and `NX_APP_BITE_TRIBE_IS_DEV:` — **with the trailing colon** — and expect no match.

   The colon is what makes this check mean anything. Grepping the bare key name always matches even in a correctly stripped bundle, because the app source declares those names as lookup constants and the minifier keeps them as plain strings: a clean production build contains `q="NX_APP_BITE_TRIBE_IS_DEV"` in the App Check chunk. Only the property form proves a **value** was inlined. Checking without the colon reports every build as contaminated, which is worse than not checking, because it trains the reader to wave the result through.

3. Confirm the gate actually reached the bundle. The plugin replaces `process.env` wholesale with the collected object, so the inlined entries land in the emitted JavaScript as object properties. Grep `dist/apps/bite-tribe` for `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:"true"` and expect a match. Note the key is **unquoted**: esbuild minifies the define object with bare identifier keys, so the JSON-shaped `"NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED":"true"` matches nothing. This is the build-time half of check 12; the device evidence is the runtime half, and neither substitutes for the other.
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
- Confirm the key metrics dashboard exists and receives data. **Confirmed on 29 August 2026.** The dashboard is not a console dashboard: GA4 has no API to create one, so the nine launch tiles in [[Implementation - Analytics Events]] live as code in `tools/analytics/dashboard.config.mjs`, and `.github/workflows/analytics-digest.yml` runs `digest.mjs` daily against GA4 property `487035057` and posts the result to [#991](https://github.com/muhammedgaygisiz/travellers-apps/issues/991). The 29 August run reported 144 restaurant and Bite views per day, 38 daily active users and 5 Bites per day, and correctly raised its own threshold alert on sign-ups at zero for the window. Two tiles stay console-only because the Data API cannot do cohorts - D1/D7 retention and crash-free users - and [#986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986) is what would close them.

## Pass Criteria

- Every check above is executed and recorded as pass, fail, or not applicable, with the reason. Where a check was deliberately not executed for the release candidate, it is recorded under Accepted Gaps below with the evidence standing in its place - never as a pass.
- No open defect that prevents registration, login, Bite creation with a photo, or app start.
- Crashlytics receives a non-fatal from each native platform, and analytics receives events from every platform.
- No crash observed on a supported OS version during the pass.

Anything else found is filed, triaged, and either fixed under issue 1177 or accepted as a known issue.

## Accepted Gaps

Decided on 29 August 2026, when the platform pass was closed out. These are checks the charter asks for that will **not** be executed before the release candidate. They are recorded here rather than left to be rediscovered, and each names the evidence that stands in its place, so a later reader can judge the substitution instead of assuming a pass.

| Gap                                           | Accepted because                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One build proven on all three platforms**   | Android passed at Run 11 on build 96, web at Run 8 on `a20f485a`, iOS at Run 7 on TestFlight build 94. The maintainer accepts three separate per-platform passes instead of one artifact proven everywhere. The residual risk is that no single artifact has been exercised end to end on all three.                                                                              |
| **Check 12 on web and iOS**                   | Executed on Android only, both halves. Web and iOS never attempted it. The enforced build is delivered on both - CI sets the flag on `deploy-bite-tribe`, and TestFlight build 95 was the first artifact carrying it - and no attestation failure has surfaced in the field, which covers the working session. **The refused-token retry gate remains unproven outside Android.** |
| **Ranking-change notification delivery**      | Never executed on either platform in eleven runs, because `sendDailyLeaderboardNotification` is scheduled and forcing it would push to every real user whose rank changed. Users have reported receiving these notifications and that they work, and push transport itself is proven on both platforms by the new-follower path.                                                  |
| **iOS Analytics DebugView**                   | iOS analytics is verified through GA4 Realtime on runs 4, 6 and 7. DebugView needs a dedicated Xcode debug-mode launch and would confirm a transport that is not in doubt. Android DebugView is verified at Run 10.                                                                                                                                                               |
| **Edge cases, exhaustively**                  | Partially covered: Run 8 reached the vacation and posting-later shape on web through the position-source modal's `Set manually` option, which is how it found [#1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307), and Run 11 covered missing location on Android by denying the permission. A real trip across a currency boundary is not tested.           |
| **The business app**                          | Out of scope for this release candidate by decision; it gets its own soft launch. See the Business App section above.                                                                                                                                                                                                                                                             |
| **Android deep-link OS auto-verification**    | `pm get-app-links` reports state 1024 only because the debug signature is not in the published `assetlinks.json`. The server half is verified independently and the app's own handling passes warm and cold. A store-signed artifact resolves it, so it belongs to [#1179](https://github.com/muhammedgaygisiz/travellers-apps/issues/1179) rather than here.                     |
| **Android Crashlytics `ErrorHandler` wiring** | The app is zoneless, so a thrown error from an injected `setTimeout` never reaches Angular's `ErrorHandler`. Run 10 called `recordException` directly - the same call the service makes - and the report uploaded, which proves the transport. The service's own wiring is verified on iOS, not on Android.                                                                       |

Everything else in this charter was executed and recorded. The accepted gaps do not include any check that a run attempted and failed.

## Result Log

Record one row per platform per execution. Keep previous rows when re-running after fixes.

| Date         | Platform | Build                                                            | Device                       | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Defects filed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------ | -------- | ---------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 29 Aug 2026  | Android  | Local debug build 1.0.1 (96), `develop` at `68f8626e`            | Samsung SM-A566B, Android 16 | **Run 11, the contingency Android re-run.** Installed **over** run 10's install, so the App Check debug secret and the app's file ownership survived. Run 10's `P0` #1414 is **verified fixed** four independent ways, and all seven closed run 10 findings are verified fixed on hardware. Bucket lists, deep links, logout and the privacy policy were **executed for the first time in this charter**, and the vacation edge case was covered by a Rome Bite posted from a Bern device. Check 12 reached its refused-token half again by dropping only the App Check token cache, which costs no console step. Three new findings, none a blocker; ranking-notification delivery and the OS half of deep-link verification recorded as not executable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428) `P2`; [#1426](https://github.com/muhammedgaygisiz/travellers-apps/issues/1426), [#1427](https://github.com/muhammedgaygisiz/travellers-apps/issues/1427) `P3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 29 Aug 2026  | Android  | Local debug build 1.0.1 (96), `develop` at `78889774`            | Samsung SM-A566B, Android 16 | **Run 10, the Android re-run.** Executed against a locally built debug artifact rather than a store artifact, because 19 commits including the Angular 22 upgrade had never run on hardware. The run 9 blocker #1385 is **verified fixed**, and nine of the eleven run 9 findings are verified fixed on the device. Check 12 executed in full for the **first time in this charter**, refused-token gate included. Converted to a regression sweep partway through, by decision, once a new `P0` was confirmed: the photo-location feature that shipped the same morning never reads a gallery photo's GPS on Android. #1395 could not be verified, because the uninstall a local build requires dropped the file ownership the migration depends on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414) `P0`; [#1411](https://github.com/muhammedgaygisiz/travellers-apps/issues/1411) `P2`; [#1412](https://github.com/muhammedgaygisiz/travellers-apps/issues/1412), [#1413](https://github.com/muhammedgaygisiz/travellers-apps/issues/1413), [#1415](https://github.com/muhammedgaygisiz/travellers-apps/issues/1415), [#1416](https://github.com/muhammedgaygisiz/travellers-apps/issues/1416), [#1417](https://github.com/muhammedgaygisiz/travellers-apps/issues/1417), [#1418](https://github.com/muhammedgaygisiz/travellers-apps/issues/1418) `P3`                                                                                                                                                                                                                                    |
| 27 Aug 2026  | Android  | Play Open Testing 1.0.1 (95), tag `build-1.0.1-95` at `f2ae6dbf` | Samsung SM-A566B, Android 16 | **Run 9, the Android first execution.** Stopped deliberately on a release-candidate blocker: account deletion is impossible outside a five-minute re-auth window. Checks 1-7, 9, 11, 13 and the accepted-token half of 12 pass; check 8 partial (onboarding asks, Settings never recovers); check 10 fails. Analytics recorded as an evidence gap, not a pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385) `P0`; [#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386), [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387) `P1`; [#1388](https://github.com/muhammedgaygisiz/travellers-apps/issues/1388), [#1389](https://github.com/muhammedgaygisiz/travellers-apps/issues/1389), [#1390](https://github.com/muhammedgaygisiz/travellers-apps/issues/1390) `P2`; [#1391](https://github.com/muhammedgaygisiz/travellers-apps/issues/1391), [#1392](https://github.com/muhammedgaygisiz/travellers-apps/issues/1392), [#1393](https://github.com/muhammedgaygisiz/travellers-apps/issues/1393), [#1394](https://github.com/muhammedgaygisiz/travellers-apps/issues/1394), [#1395](https://github.com/muhammedgaygisiz/travellers-apps/issues/1395) `P3` |
| 17 Aug 2026  | Web      | Deployed 1.0.1 (95), `develop` at `a20f485a`                     | Chrome, macOS                | Run 8, web only. **All six Run 7 web findings verified fixed** — #1326, #1327, #1328, #1329, #1330, #1331 — plus #1325 and #1307, and #1334 which no run had checked. **Both Playwright suites executed for the first time in this charter**, serially and green: `bite-tribe-e2e` 39 passed, `bite-tribe-business-e2e` 1 passed. Registration, all seven onboarding steps taken down the **default** path, Bite creation and deletion with both toasts captured as objects, the three-step account deletion with its audit record, and the display-name reservation release all verified. **Result: pass for the web half**, no `P0` and no `P1` outstanding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Two filed, neither a blocker: [#1343](https://github.com/muhammedgaygisiz/travellers-apps/issues/1343) `P2`, the profile page's unfollow dialog is hardcoded English while the followers list translates the same dialog; [#1344](https://github.com/muhammedgaygisiz/travellers-apps/issues/1344) `P3`, the `My Bites` searchbar is flush left while the chip row above it is centred. The generic delete-account failure message was raised and **dismissed by decision** as intended anti-guessing behaviour                                                                                                                                                                                                                                                                                                                                                  |
| 15 Aug 2026  | Web      | Deployed 1.0.1 (95)                                              | Chrome, macOS                | Run 7 web half executed for the **first time in this charter**; build identity, bundle cleanliness, App Check attestation, registration, password gate, all seven onboarding steps, the new user document, the web deep link, #1308, search, Bucket Lists, Leaderboard, Marketplace, settings, About, the privacy policy, My Bites, the Bitemap with clustering, Bite creation and deletion with #1305 and #1310, logout/login, the Business app build identity, and the three-step account deletion all verified; **fail on two P0 findings** Six filed: [#1326](https://github.com/muhammedgaygisiz/travellers-apps/issues/1326) onboarding step 2 blocked on the pre-selected default and [#1327](https://github.com/muhammedgaygisiz/travellers-apps/issues/1327) eager per-card delete alerts, both `P0` by decision; [#1328](https://github.com/muhammedgaygisiz/travellers-apps/issues/1328) `P1`, the local gallery is not scoped to the account so a new sign-in sees the previous user's photos; [#1329](https://github.com/muhammedgaygisiz/travellers-apps/issues/1329) `P2`, a raw translation key on the bucket list sort chip; [#1330](https://github.com/muhammedgaygisiz/travellers-apps/issues/1330) and [#1331](https://github.com/muhammedgaygisiz/travellers-apps/issues/1331) `P3`, a full-width searchbar on desktop and empty-feed copy shown for an empty search |
| 15 Aug 2026  | iOS      | TestFlight 1.0.1 (94)                                            | iPhone 12 mini, iOS 26.6     | Run 7 executed; **all seven fixes in the build verified**, #1232 re-verified; #1308 blocker resolved so build 94 carries no inherited P0; release-candidate pass for the iOS half, incomplete overall with Android and web unexecuted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | One minor finding filed for the creation form drawing the position marker in the wrong source colour. #1305's failure path, #1308's unresolvable-author fallback, and the deleted Bite's Storage object accepted by decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 10 Aug 2026  | iOS      | TestFlight 1.0.1 (93)                                            | iPhone 12 mini, iOS 26.6     | Run 6 executed; **both inherited P0s resolved** — #1232 verified end to end, #1181's dSYM question closed as not-a-defect; 15 issues verified fixed; #1265 refuted; release-candidate fail on one new P0, #1308                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | [#1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303) to [#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310); [#1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308) accepted as a blocker, the rest non-blocking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 8 Aug 2026   | iOS      | TestFlight 1.0.1 (92)                                            | iPhone 12 mini, iOS 26.5.2   | Run 5 executed partially by decision; release-candidate fail with two open P0 findings; #1229, #1244, #1246 verified fixed and #1230, #1245 confirmed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) reopened, [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) still open, plus [#1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) to [#1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273) non-blocking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6 Aug 2026   | iOS      | TestFlight 1.0.1 (91)                                            | iPhone 12 mini, iOS 26.5.2   | Run 4 executed; release-candidate fail with six open P0 findings; #1230, #1231, #1233, #1234 verified fixed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229), [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244), [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245), [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181), [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246), [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232)                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4 Aug 2026   | iOS      | TestFlight 1.0.1 (90)                                            | iPhone 12 mini, iOS 26.5.2   | Run 3 executed; release-candidate fail with six P0 defects and four recorded evidence gaps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229), [#1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230), [#1231](https://github.com/muhammedgaygisiz/travellers-apps/issues/1231), [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232), [#1233](https://github.com/muhammedgaygisiz/travellers-apps/issues/1233), [#1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234)                                                                                                                                                                                                                                                                                                                                                                                                       |
| 3 Aug 2026   | iOS      | TestFlight 1.0.1 (89)                                            | iPhone 12 mini, iOS 26.5.2   | Failed and aborted: registration blocker #1219 reproduced twice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | [#1217](https://github.com/muhammedgaygisiz/travellers-apps/issues/1217), [#1218](https://github.com/muhammedgaygisiz/travellers-apps/issues/1218), [#1219](https://github.com/muhammedgaygisiz/travellers-apps/issues/1219)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 28 July 2026 | iOS      | TestFlight 1.0.1 (87)                                            | iPhone 12 mini, iOS 26.5.2   | Preliminary partial pass; not release-candidate evidence because build 88 was not distributed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Issues [#1182](https://github.com/muhammedgaygisiz/travellers-apps/issues/1182) to [#1190](https://github.com/muhammedgaygisiz/travellers-apps/issues/1190)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Android Execution - Build 96 (Run 11)

The contingency Android re-run for issue 1354, executed on 29 August 2026 against a **locally built debug artifact installed over run 10's install**, so the App Check debug secret and the app's MediaStore file ownership both survived.

**Result: release-candidate pass for the Android half, with two checks recorded as not executable rather than executed.**

Run 10's `P0` is cleared and every run 10 finding that was closed is verified fixed on hardware. Three new findings were filed, none of them a blocker.

### Entry State And Build Identity

| Property   | Value                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Source     | `develop` at `68f8626e`, 7 commits after run 10's `78889774`                                                                       |
| Version    | 1.0.1 (96), `versionCode=96` - **unchanged from run 10**, so the source commit is the only build discriminator                     |
| Artifact   | `app-debug.apk`, built locally, installed **over** run 10's install rather than after an uninstall                                 |
| Device     | Samsung SM-A566B, Android 16 / SDK 36, serial `RZGYC0B33ET` - the same device as runs 9 and 10                                     |
| Web bundle | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production --skip-nx-cache`, `main-4V4BKVR2.js` |
| Accounts   | one fresh account, `muhammed.gaygisiz@bitetribe.app`, uid `qqcOGO2bVvSBKLWC9GzsFPYCMIf1`, deleted at the end of the run            |

Bundle cleanliness was checked as the charter requires: no `NX_APP_BITE_TRIBE_IS_DEV:`, no `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:`, and `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` present as `` `true` ``. The wrapper sync produced **no** native diff and `assets/public/` carried the `main-4V4BKVR2.js` just built.

### Installing Over, And What It Bought

Run 10 had to uninstall build 95, which cost it #1395's verification. This run installed over run 10's own debug build, which the debug signing key allows, and that preserved three things worth naming:

- **The App Check debug secret** `f54c5836-59fc-465a-8a39-142586afbd62`, still allow-listed in the console and still accepted, so the app reached its first screen with no console step.
- **The app install's Linux uid** `u0_a468`, so #1413's residual could be re-read in exactly the state its follow-up described.
- **The run 10 geotagged fixture**, so #1414 was re-tested against a byte-identical file (`md5 1c5d2597…`).

### The Seven Run 10 Findings

| Issue                              | Verdict                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| #1414 gallery photo GPS `P0`       | **Verified fixed**, four independent ways. See below                                             |
| #1411 App Check gate layout        | **Verified fixed on hardware**, measured                                                         |
| #1412 onboarding location step     | **Verified fixed** - a fresh account with the permission already granted reads "Location is on." |
| #1413 legacy migration             | **Behaves exactly as the not-fixed decision documents**                                          |
| #1415 Portuguese exonym            | **Verified fixed** - the picker is all endonyms, `Português` included                            |
| #1416 Turkish strings, theme label | **Verified fixed** across all three languages: `Tema`/`Aydınlık`, `Design`, `Thème`              |
| #1417 My Bites empty state         | **Verified fixed** - "You haven't shared a Bite yet. Create your first one."                     |

#1385, the run 9 blocker, was re-verified in passing: the deletion page reads "Signed in with email and password" while Android's `providerData` still returns `[{firebase},{password}]`.

### #1414, The Blocker, Cleared

The fix is the `@capawesome/capacitor-file-picker` downgrade to 8.0.2. Four independent lines of evidence, all on the same device and the same byte-identical fixture as run 10:

| Evidence         | Run 10 (`78889774`)              | Run 11 (`68f8626e`)                                               |
| ---------------- | -------------------------------- | ----------------------------------------------------------------- |
| Picker activity  | `PickVisualMedia` (Photo Picker) | `GalleryExternalActivity` - `ACTION_PICK`, a MediaStore URI       |
| Position label   | "From photo - No GPS in photo"   | "From photo"                                                      |
| Currency prefill | stayed Swiss Franc               | flipped to **Euro**                                               |
| Map tiles        | Bern                             | z15 x17510-17511 y12178-12179 → 41.8859/12.3706 … 41.8777/12.3816 |

The currency flip is the strongest of the four because it is an independent consumer of the Bite position and cannot be produced by a label change. The restaurant picker corroborated a fifth time, returning Rome restaurants at "0.9 km from the Bite / 685.1 km from you", and the stored Bite reverse-geocoded to "La Massimina-Casal Lumbroso, Italy".

### Checks

| #                                         | Result                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1 Registration + onboarding               | Pass, 8 steps                                                                                                                    |
| 2 Login / logout / session restore        | **Pass in full for the first time.** Logout verified (`getCurrentUser()` null), session restore across a cold start verified     |
| 3 Bite with photo, failure state, retries | Pass for creation and upload. Failure state and retries not re-exercised; run 10 verified them                                   |
| 4 Location, currency prefill, override    | Pass. Swiss Franc suggested from `Europe/Zurich` on an `en-DE` device, second consecutive run of the charter's named assertion   |
| 5 Map, markers, drawer                    | Pass. Markers paint, clusters expand, drawer opens on marker tap; #1392's formula re-measured as offset 712px − 48px inset = 664 |
| 6 Search                                  | **Pass across Bite, City and Restaurant**, the widest search coverage of any run                                                 |
| 7 Bucket list                             | **Pass, executed for the first time**: create, add, swipe-to-tick, swipe-to-undo, persistence. One finding                       |
| 8 Notifications                           | Permission `granted` and a 142-char FCM token registered. **Delivery still not executed** - see Not Executed                     |
| 9 Deep links                              | **Pass, executed for the first time**, warm and cold start. OS auto-verification half not testable - see Not Executed            |
| 10 Privacy policy / account deletion      | **Pass in full for the first time.** Policy renders complete, 9 sections; deletion completed through the re-auth path            |
| 11 Menus + local gallery                  | Gallery half pass, correctly uid-scoped. Menu half not re-executed this run; run 10 verified it                                  |
| 12 App Check enforced                     | **Pass, both halves**, by a new technique - see below                                                                            |
| 13 Verification-mail resend               | **Pass, confirmed at the recipient**: `BiteTribe <noreply@bitetribe.app>`, one word, subject in the account language             |

### Check 12 Without Costing The Debug Secret

Run 10 reached the refused-token gate only because its secret was not yet registered - a state that cannot be re-entered without an uninstall. This run reached it a second time, and cheaply.

An offline cold start alone does **not** gate: `preflightAppCheckToken` calls `getToken({ forceRefresh: false })`, a cached token satisfies it, and the app starts into cached content behind its offline banner. The code makes no distinction between a network failure and an attestation refusal, so the gate's behaviour there is decided entirely by whether a cached token exists.

Deleting **only** `shared_prefs/com.google.firebase.appcheck.store.*.xml` - the token cache - while leaving `…appcheck.debug.store.*.xml` - the secret - untouched forces a fetch on the next launch. Offline, that fetch fails and the gate renders. Restoring the network and tapping **Try again** resumed the app **without a restart**, and the token store was rewritten against the same kept secret.

This is the repeatable way to exercise the gate on a device, and it costs no console step.

### #1411, Measured Rather Than Eyeballed

With the gate rendered: `--ion-safe-area-top` is 35px, the gate's `--padding-top` resolves to `calc(1rem + 35px)`, and the heading sits at y=326 in an 832px viewport - centred, and 291px clear of the status bar it collided with in run 10.

### New Findings

- **An empty bucket list shows the discovery feed's empty state** ([#1426](https://github.com/muhammedgaygisiz/travellers-apps/issues/1426) `P3`), "No bites found. Be the first one.", on the user's own list. This is #1417's defect on a surface its fix did not cover: `bucket-list.container.ts` never passes `emptyMessageKey`, so it inherits the default that #1417 added the override for. Verified as a direct A/B on one build - My Bites correct, bucket list wrong.
- **Settings renders currency names unlocalized** ([#1427](https://github.com/muhammedgaygisiz/travellers-apps/issues/1427) `P3`). "Swiss Franc" in Turkish, German and French, while the picker those same rows open renders "İsviçre frangı". `settings.component.ts` reads the catalog's raw English `name` in `selectedCurrencyName` and `favoriteCurrencyNames`; the onboarding step has the identical two signals and routes both through `getLocalizedCurrencyName`, so Settings is the outlier rather than the convention.
- **The Nx cache can silently disarm the App Check gate** ([#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428) `P2`). `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` is not part of the build target's cache key, so the charter's step 1 returned a cached bundle carrying `` ENFORCED:`false` ``. Only the charter's own step 3 grep caught it. The build needs `--skip-nx-cache`, or the variable belongs in the target's inputs.

### Raised And Dismissed By Investigation

- **Turkish casing on non-Turkish restaurant names.** "JOHNY'S ROAD KİTCHEN", "MEGA PİZZA KURİER". This is the intended consequence of #1388's document-level `lang`, which that issue asked for explicitly; "BERN, İSVİÇRE" is now correct where run 9 read "İSVIÇRE".
- **A privacy policy that names no contact address.** The bare word "Contact" is a click-to-reveal control, not a missing value; tapping it renders the address.
- **Three identical search results** for "Chicken Tikka Masala / Dörfli Schliern". Three distinct image UUIDs, so three real Bites of the same dish at one restaurant.

### Confirmed Still Open

**#1418** reproduces on this build in both halves: the local copy survived Bite deletion, and it survived account deletion. While the account lived the orphan was visible and deletable in its own Gallery; once the account was gone it joined run 10's under a uid no session will ever carry again. The device now holds **two** stranded directories, `oVcIptzv…` and `qqcOGO2b…`, one per deleted test account.

The maintainer decided during this run that a local copy **should** survive Bite deletion, so that half is now intended behaviour and what remains is the account-deletion half plus a disclosure gap: the deletion page enumerates what goes and what stays with care, and local copies appear in neither list.

### Methodology Notes

- **Read the page by what is painted, not by DOM order.** The Ionic nav stack keeps earlier pages mounted and the last non-hidden `.ion-page` is not reliably the visible one - it reported step 1 while the device showed step 2. Anchoring on `document.elementFromPoint` at several probe points and taking the majority `.ion-page` is correct where "last" is not.
- **The hardware BACK key pops the page, not just the overlay.** Using it to close a modal repeatedly walked the app one screen further back than intended, and twice walked it out of the app entirely onto whatever the launcher showed. Close overlays with their own Cancel control, and guard every tap on `topResumedActivity` being `com.bitetribe.app` - a stray tap opened Samsung's Sleep mode editor.
- **The soft keyboard raises system dialogs of its own.** Samsung Keyboard's "Use Translation?" consent dialog swallowed taps until dismissed.
- **A search field keeps its previous query**; typing appends. Clear before retyping or the second search runs as `ChickenBern`.
- **`--skip-nx-cache` belongs in the charter's build step.** See the finding above.

### Not Executed

- **Ranking-change notification delivery.** `sendDailyLeaderboardNotification` is an `onSchedule` function that runs at 09:00 Europe/Zurich and diffs against yesterday's baseline. Forcing it would push notifications to **every** real user whose rank changed, so it was deliberately not triggered. The device half is armed: permission granted and an FCM token registered.
- **Deep link OS auto-verification.** `pm get-app-links` reports state 1024 for `bite-tribe.web.app`, because the debug signature `7A:9E:0E:9E…` is not among the two fingerprints in the published `assetlinks.json`. The server half was verified independently - the file is served at 200 with both release fingerprints - and the app's own handling passes warm and cold. Only the OS half needs a store-signed build.
- **The business app**, which needs its own build and was out of scope for this device run.
- **The Bitemap drawer's full drag** through its snap points, which synthetic input cannot reach; the drawer was opened by marker tap and its safe-area formula read from the DOM.
- **Check 3's upload failure and retry paths**, and **check 11's restaurant menu**, both verified by run 10 and not re-exercised here.

### Run 11 Outcome

**Release-candidate pass for the Android half.**

The run 10 blocker is cleared and all seven closed run 10 findings are verified fixed on hardware. Three new findings were filed and none blocks a release candidate: two are localisation or copy defects on secondary surfaces, and the third is a build-process trap rather than a product defect. Two checks are recorded as not executable rather than as passes, and the reasons are structural rather than incidental.

### Run 11 Cleanup Inventory

- **The test account is deleted.** `muhammed.gaygisiz@bitetribe.app` / uid `qqcOGO2bVvSBKLWC9GzsFPYCMIf1`, removed through the product's own deletion flow. Its Bite was deleted first, following run 10's lesson.
- **The App Check debug secret `f54c5836-59fc-465a-8a39-142586afbd62` is still allow-listed and still on this install.** Deleting the token cache does not disturb it. Keep it while this install stands.
- **Two orphaned local image directories remain**, `oVcIptzv…` from run 10 and `qqcOGO2b…` from run 11. See #1418.
- **Both geotagged fixtures remain** at `/sdcard/Pictures/run10-geotagged.jpg` and `run11-geotagged.jpg`, byte-identical, useful if the photo-location path is tested again.
- **115 legacy files remain in `/sdcard/Documents`** plus 3 directories, untouched and unreachable. See #1413.
- **The device is left signed out**, network restored, with location, notifications and media-location granted, and the app in English.

## Android Execution - Build 96 (Run 10)

The Android re-run for issue 1353, executed on 29 August 2026 against a **locally built debug artifact** rather than a store artifact, and stopped by decision once the regression sweep was complete and a new `P0` was on the board.

**Result: release-candidate fail for the Android half. The run 9 blocker is resolved; a new P0 replaces it.**

### Entry State And Build Identity

| Property   | Value                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Source     | `develop` at `78889774`, 19 commits after `build-1.0.1-95`                                                              |
| Version    | 1.0.1 (96), `versionCode=96`                                                                                            |
| Artifact   | `app-debug.apk`, built locally, `installerPackageName=null`                                                             |
| Device     | Samsung SM-A566B, Android 16 / SDK 36, serial `RZGYC0B33ET` - the same device as run 9                                  |
| Web bundle | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production`, `main-TL2IUFNP.js`      |
| Accounts   | one fresh account, `muhammed.gaygisiz@bitetribe.app`, uid `oVcIptzvpFY294zrSDySZvAKxDW2`, deleted at the end of the run |

Bundle cleanliness was checked as the charter requires: no `NX_APP_BITE_TRIBE_IS_DEV:`, no `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:`, and `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` present as `true`. The wrapper sync produced **no** native diff and `assets/public/` carried the `main-TL2IUFNP.js` just built.

Build identity agreed in three independent places: `dumpsys` reported `versionCode=96`, the menu reads `Version 1.0.1 (Build 96)`, and the push-token document written to Firestore carries `appVersion: "1.0.1 (96)"`. #1303's version disagreement does not reproduce on Android.

### Why A Local Build, And What It Cost

The charter asks for the store artifact. This run deliberately used a local build because 19 commits, including the Angular 22 / NgRx 22 / TypeScript 6 upgrade in `d7e45edd`, had landed since build 95 and none of them had ever run on hardware.

The debug variant was chosen over a locally signed release APK on purpose. `apps/bite-tribe-android/android/app/build.gradle` adds `firebase-appcheck-debug` to the debug variant only; a sideloaded release APK is signed with the upload key rather than the Play app-signing key, so Play Integrity would refuse a token and the enforced-mode gate would have blocked the entire app at launch.

That choice paid for itself twice and cost once:

- **It reached check 12's refused-token half**, which no run in this charter had ever executed, simply by launching before the App Check debug secret was allow-listed.
- **It gave WebView DevTools**, so layout defects were measured rather than eyeballed.
- **It cost #1395.** A debug APK cannot install over a Play-signed one, so build 95 had to be uninstalled, and that dropped MediaStore ownership of the 115 legacy files the migration was supposed to sweep. See below.

### Checks

| #                                         | Result                                                                                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Registration + onboarding               | Pass. Now **8 steps**, up from 7, with the new photo-location step                                                                                                                                                                       |
| 2 Login / logout / session restore        | Pass for session restore across a cold start, including resuming onboarding mid-assistant. Logout and re-login not executed                                                                                                              |
| 3 Bite with photo, failure state, retries | Pass                                                                                                                                                                                                                                     |
| 4 Location, currency prefill, override    | Pass. Onboarding suggested **Swiss Franc** from `Europe/Zurich` on an `en-DE` device, the exact assertion the charter singles out, and the Bite form prefilled CHF from the account default. Grant **and** denial branches both executed |
| 5 Map, markers, drawer                    | Pass. Leaflet markers paint on device; clustered markers, drawer, and #1392's safe-area all verified                                                                                                                                     |
| 6 Search                                  | Pass for restaurants, including Google Places results                                                                                                                                                                                    |
| 7 Bucket list                             | **Not executed**                                                                                                                                                                                                                         |
| 8 Notifications                           | Pass for permission, registration and Settings recovery. **Ranking-change delivery still not executed**                                                                                                                                  |
| 9 Deep links                              | **Not executed**                                                                                                                                                                                                                         |
| 10 Privacy policy / account deletion      | **Deletion passes.** The run 9 blocker is fixed. Privacy policy page not opened                                                                                                                                                          |
| 11 Menus + local gallery                  | Pass. Menu loads and reads from cache offline; gallery correctly scoped and empty for a new account                                                                                                                                      |
| 12 App Check enforced                     | **Pass, both halves, for the first time in this charter**                                                                                                                                                                                |
| 13 Verification-mail resend               | Pass                                                                                                                                                                                                                                     |

### Check 12, Executed In Full For The First Time

Run 9 could only prove the accepted-token half, because a Play-distributed build cannot be made to fail attestation on demand. A locally signed debug build fails it by default until its secret is registered.

- **Refused token:** `FirebaseAppCheck.getToken` returned `403 App attestation failed`, `preflightAppCheckToken` caught it, `isAppCheckReady` failed closed, and the router outlet was never mounted. The gate rendered its Transloco copy and blocked the app, which is issue #933 working.
- **Recovery:** after the secret was allow-listed, **Try again** ran `exchangeDebugToken`, `tokenChanged` fired, and the app resumed into the landing screen **without a restart**.
- **Google Maps Platform, read separately as the charter requires:** the nearby-restaurant list and a text restaurant search both returned results while the Firebase APIs were enforced, including Google Places entries marked "not verified on BiteTribe yet".

The gate's own layout is wrong, which is [#1411](https://github.com/muhammedgaygisiz/travellers-apps/issues/1411).

### The Eleven Run 9 Findings

| Issue                          | Verdict                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| #1385 account deletion         | **Verified fixed.** See below                                                                                   |
| #1386 notification settings    | **Verified fixed**, all three parts                                                                             |
| #1387 native analytics         | **Verified fixed**                                                                                              |
| #1388 Turkish uppercase        | **Verified fixed**                                                                                              |
| #1389 restaurant tag dedup     | Consistent with the fix, inferred from output                                                                   |
| #1390 upload retry             | **Verified fixed**, both halves                                                                                 |
| #1391 tag lost without a space | **Verified fixed**, end to end                                                                                  |
| #1392 drawer safe area         | **Verified fixed on hardware**                                                                                  |
| #1393 photo source order       | **Verified fixed**                                                                                              |
| #1394 Android Photo Picker     | **Verified fixed**                                                                                              |
| #1395 legacy image sweep       | **Not verifiable on this device.** See [#1413](https://github.com/muhammedgaygisiz/travellers-apps/issues/1413) |

#### #1385, the run 9 blocker, resolved

The platform quirk that caused it is **still present**: `providerData` on Android still returns `[{providerId: "firebase"}, {providerId: "password"}]`, so anything reading index 0 still gets an unusable value. The client now looks past it. The delete-account page reads **"Signed in with email and password"** where run 9 read "Signed in with a linked account".

Executed on a session roughly **seventy minutes old**, far outside `REAUTH_MAX_AGE_SECONDS`, which is the exact state run 9 could not get past:

```
account_deletion_started
FirebaseFunctions: reauth_required        <- backend still demands re-auth, as it always correctly did
   password prompt shown and answered
account_deletion_completed
FirebaseAuthentication.signOut
```

The app returned to `/start` and `getCurrentUser()` reports nobody signed in. Store policy and GDPR are satisfied on Android.

#### #1386, verified in all three parts

Revoking `POST_NOTIFICATIONS` underneath the running app and returning to Settings produced "Your device settings are blocking BiteTribe notifications", the device row read "Turned off in your device settings", and **two** recovery affordances appeared. "Turn on notifications" raised the OS dialog, and granting it cleared the warning **live, without a reload**.

#### #1387, verified at two levels

`com.google.android.gms.measurement.prefs.xml` now carries `measurement_enabled_from_api=true`, which is the persisted flag that used to strand a device that had once run a dev build. DebugView then showed 48 events in thirty minutes from this device, including `coach_mark_dismissed` exactly four times, matching the four dismissed by hand, under `user_id oVclptzv...vAKxDW2`.

#### #1390, verified with the network actually off

Posted with wifi and mobile data disabled, confirmed by `Active default network: none`. The upload timed out after the 30s `STALLED_UPLOAD_TIMEOUT_MS` into "Photo couldn't be uploaded" instead of spinning forever, and **no retry button was offered while offline** - the copy read "You're offline - reconnect to upload this photo". On reconnect the upload recovered on its own and the image is served from Firebase Storage at 1136x640, the fixture's dimensions.

Worth recording for the charter's wording: check 3 asks for "both retry paths", and the **manual** retry button was never reached, because reconnect recovered the upload automatically. That is the better behaviour, not a coverage gap.

#### #1392, measured rather than eyeballed

The drawer was dragged open by hand, because injected `adb shell input swipe` events do not reach its JS drag handlers. With `--ion-safe-area-bottom: 48px`, the drawer published `--snap-drawer-offset: 352px` and applied `translateY(304px)`, exactly `352 - 48`. Content ends at `y=749` against a band starting at `y=784`: **35px clear**. The issue's own write-up listed "not verified on a device" as open; it is now closed.

### #1395 Could Not Be Verified, And Why

The migration ran - `Filesystem.checkPermissions()` returned `{"publicStorage":"granted"}` and `files/<uid>/` was created the moment the Gallery opened - and moved nothing. All 115 legacy files remain.

The app's own `readdir` on public `Documents` **succeeds** and returns only the three directories; not one of the 115 files is listed. Inside the uid-scoped legacy directory, the shell shows three files and the app sees zero. Scoped storage hides files the current install does not own, and the uninstall this run required is what dropped that ownership.

An in-place Play update from 95 to 96 would most likely have migrated them. But #1395 exists precisely because these files _survive uninstall_, and files that survive an uninstall are exactly the ones the app can never see again. Filed as [#1413](https://github.com/muhammedgaygisiz/travellers-apps/issues/1413).

After the run, the maintainer signed in with the account that owns `Documents/3HaVavOKbzRuNjg6p2ceUAH0pgh2/` and opened the Gallery, which closes the last confound. The first test read that directory while signed in as a _different_ account, leaving open the possibility that the second migration loop only fails on a uid mismatch. It does not: `files/3HaVavOK.../` was created, so `prepare()` ran, and stayed empty; the Gallery told the owning account "No locally saved images found." while 118 of its files sat on the device; and `readdir` on the `Documents` root returned the three directories and **zero** of the 115 files. The filtering is tied to the app install's Linux uid, `u0_a302` then `u0_a468`, not to the signed-in account, so no in-app path can ever reach these files on this device again.

A second defect surfaced from the same session. One prediction was **refuted**: the migration adopts loose files on native, so a fresh account should have inherited 115 photos from the previous owner. It did not, for the same ownership reason, and the Gallery correctly read "No locally saved images found." #1328 remains web-only, as run 9 also found.

### The New Blocker

**[#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414) `P0` - gallery photo GPS is never read on Android.**

Onboarding step 6 of 8, new in `78889774`, exists only to request `ACCESS_MEDIA_LOCATION` and promises "a Bite you post from your gallery already knows where you ate". On Android the permission is requested and produces nothing. The mechanism recorded below was revised after the run; the observations here stand, the first diagnosis did not.

Proven with the committed e2e fixture `bite-geotagged.jpg`, pushed to the device and media-scanned. Its coordinates are 41.875 N, 12.375 E - Rome, deliberately far from Bern, so a photo-derived position cannot be confused with the device fix:

- the file on the device is byte-identical to the repo fixture, sha256 match
- an independent parser reads `41.875000 N, 12.375000 E` straight off the device
- the app logged `{"accessMediaLocation":"granted"}` at pick time, and `dumpsys` agrees
- the position modal still reports **"From photo - No GPS in photo"** and disables the source

The cause is in the Capacitor plugin, not app code - but **not** the missing `MediaStore.setRequireOriginal` the run first concluded. That call lifts redaction on `MediaStore` URIs obtained by querying `MediaStore` directly; it does nothing for Android Photo Picker URIs, which are redacted unconditionally regardless of `ACCESS_MEDIA_LOCATION` ([google/issuetracker#243294058](https://issuetracker.google.com/issues/243294058)). Patching the plugin as the run proposed would have been a no-op.

The actual cause is a **dependency bump**. `@capawesome/capacitor-file-picker@8.0.3` rewrote `pickImages` from `Intent.ACTION_PICK` to `ActivityResultContracts.PickVisualMedia` (upstream `327b8bfd`, PR #893). `ACTION_PICK` returns a MediaStore URI whose EXIF survives; the Photo Picker's does not. The bump landed on 20 Jul 2026 in `834221e5`, five weeks before this run.

Established on the device by installing four builds differing only in picker version, each verified before install by extracting `FilePickerPlugin.class` and confirming which constant it carries:

| Build                                       | Picker intent     | Result                                  |
| ------------------------------------------- | ----------------- | --------------------------------------- |
| 96 (`78889774`), picker 8.0.3               | `PickVisualMedia` | no position                             |
| Run 9 code (`f2ae6dbf`), picker 8.0.3       | `PickVisualMedia` | no position                             |
| Run 9 code (`f2ae6dbf`), picker **8.0.1**   | `ACTION_PICK`     | **position read**                       |
| Current code (`14022581`), picker **8.0.2** | `ACTION_PICK`     | **position read, no permission prompt** |

**This corrects the run's framing of the defect.** The gallery position worked on Android from #571 (26 Jan 2026) until the picker bump, so #1410 did not break it - it made a five-week-old silent breakage visible and harmful by adding an onboarding step that asks for a privacy-sensitive permission and returns nothing. Nothing exercised the Android gallery position in that window; run 9 used the gallery path but never checked the position, which is the coverage gap that let the regression through. The `P0` stands; its cause does not.

Resolved by pinning the picker to `8.0.2`, with a `pickFiles` fallback for the OEM `file://` case the pin reintroduces. See the Gallery Picker Version Pin in [[Architecture - Capacitor]].

Raised to `P0` by decision, with the accepted consequence recorded on the issue: build 96 fails its release-candidate check on the Android half while it is open. Nothing malfunctions in a core journey - the position falls back to GPS, restaurant, Google place or manual - but asking every new user for a privacy-sensitive permission and returning no value for it is worse than not asking.

### Findings Filed

| Issue                                                                    | Priority | Summary                                                                               |
| ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------- |
| [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414) | `P0`     | Gallery photo GPS never read on Android; the photo-location step delivers nothing     |
| [#1411](https://github.com/muhammedgaygisiz/travellers-apps/issues/1411) | `P2`     | App Check retry gate is top-aligned and collides with the status bar                  |
| [#1412](https://github.com/muhammedgaygisiz/travellers-apps/issues/1412) | `P3`     | Onboarding location step ignores an already-granted permission                        |
| [#1413](https://github.com/muhammedgaygisiz/travellers-apps/issues/1413) | `P3`     | Legacy local-image migration cannot see files owned by a previous install             |
| [#1415](https://github.com/muhammedgaygisiz/travellers-apps/issues/1415) | `P3`     | Language picker names Portuguese by exonym, breaking the endonym convention           |
| [#1416](https://github.com/muhammedgaygisiz/travellers-apps/issues/1416) | `P3`     | Turkish settings strings drop their diacritics; theme label wrong in `tr`, `de`, `fr` |
| [#1417](https://github.com/muhammedgaygisiz/travellers-apps/issues/1417) | `P3`     | My Bites shows the discovery feed's "Be the first one" empty state                    |
| [#1418](https://github.com/muhammedgaygisiz/travellers-apps/issues/1418) | `P3`     | Local image copies survive Bite deletion and account deletion                         |

Three of the eight - #1415, #1416 and #1417 - were spotted by the maintainer reading the screen, not by the automated sweep, and #1418 came out of a follow-up the maintainer proposed. All three are localisation or copy defects on surfaces the sweep had already walked past. Worth remembering when planning run 11: a second pair of eyes on rendered text finds a class of defect that instrumentation does not look for.

### Raised And Dismissed By Investigation

Four candidate defects were investigated and ruled out. They are recorded so a later run does not re-open them:

- **Onboarding "Next" appearing to need a blur.** Ruled out by polling the button state without ever blurring: it enables about a second after typing, with the input still focused. What looked like a commit-on-blur bug was the display-name availability round trip.
- **The photo-locations OS dialog asking for "photos and videos" rather than locations.** Platform behaviour: `ACCESS_MEDIA_LOCATION` sits in the media permission group, so the app cannot reword the dialog. `READ_MEDIA_IMAGES` is deliberately never declared, so even "Allow all" grants only `READ_MEDIA_VISUAL_USER_SELECTED`, consistent with #1394.
- **The location step offering no way back after a denial.** Session-only; a restart restores both buttons.
- **A like chip missing on an own Bite.** Intended: read-only mode hides the chip when there is nothing to report, and the Bite had no likes.

### Methodology Notes

- **`document.body.innerText` is not the visible page.** The Ionic nav stack keeps earlier pages mounted, so `body.innerText` mixes the current step with every step behind it - it reported "Step 1 of 8" while the device showed step 2. Read the last `.ion-page` that is neither hidden nor mid-transition. The helper used here also returns device-pixel tap targets, which removes the screenshot-to-coordinate arithmetic entirely.
- **`adb shell input text` drops spaces**; use `%s`. A tap aimed at a control while the soft keyboard is up lands on the keyboard.
- **Injected drags do not reach JS drag handlers.** The Bitemap drawer had to be opened by hand.
- **The app is zoneless.** `Zone` is undefined and `setTimeout` is unpatched, so a thrown error from an injected `setTimeout` never reaches Angular's `ErrorHandler` and files no non-fatal. The Crashlytics probe therefore called `FirebaseCrashlytics.recordException` directly - the same call `FirebaseErrorHandlerService` makes - and the report uploaded on the next launch, confirmed by a request to `crashlyticsreports-pa.googleapis.com`. **This proves the transport, not the app's error-handler wiring**, which remains unverified on a device.
- **The charter's bundle greps assume double quotes.** This build's minifier emits backticks, so a value check written as `NX_...:"true"` finds nothing. The documented trailing-colon greps are unaffected.

### Not Executed

Bucket lists; deep links; the privacy policy page; logout and re-login; ranking-change notification delivery; the vacation, posting-later and no-signal edge cases; the business app; the manual retry button; #1384's menu **error** state, which could not be forced because the menu reads from the Firestore cache offline; and #1403's read-only-but-visible like chip, which needs a second account to like the Bite.

### Run 10 Outcome

**Release-candidate fail for the Android half, and incomplete by decision.**

The run 9 blocker is genuinely resolved and nine of the eleven run 9 findings are verified fixed on hardware. Against that, the feature that shipped this morning does not work on Android, and it is the reason the half still fails. The half was converted from a full charter execution to a regression sweep partway through, by decision, once #1414 was confirmed.

### Run 10 Cleanup Inventory

- **The test account is deleted.** `muhammed.gaygisiz@bitetribe.app` / uid `oVcIptzvpFY294zrSDySZvAKxDW2` was removed through the product's own deletion flow at the end of the run.
- **The test Bite was deleted first, deliberately.** The deletion disclosure says Bites survive the account without the author's name, so deleting the account first would have stranded "Run10 Geotag Test" in production permanently. Delete test Bites before deleting a test account.
- **`/sdcard/Pictures/run10-geotagged.jpg` is still on the device.** The e2e fixture pushed for the #1414 proof. Harmless, and useful if #1414 is re-tested on this device.
- **115 legacy files remain in `/sdcard/Documents`**, now orphaned beyond the app's reach. See #1413.
- **The App Check debug secret `f54c5836-59fc-465a-8a39-142586afbd62` is allow-listed** in the Firebase console for this install, and is **deliberately being kept** so the #1414 fix can be verified on this device without repeating the setup. It is tied to the install rather than to the app: redeploying over it with `nx run bite-tribe-android:run` keeps the same secret, because the debug signing key does not change, so a fix cycle needs no new registration. An **uninstall** regenerates it and leaves a dead entry in the console. Remove it when this install is finally replaced, and note that the same uninstall would again cost the file ownership #1413 depends on.
- **The device is left signed out**, with location, notifications and media-location granted, and the app in English.

## Android Execution - Build 95 (Run 9)

The first Android execution in this charter. Stopped deliberately partway through on a release-candidate blocker rather than completing the matrix, at the tester's decision.

### Entry State And Build Identity

- Build under test: the Google Play Open Testing artifact, `com.bitetribe.app` **1.0.1 (95)**, installer `com.android.vending`, delivered as split APKs. Tag `build-1.0.1-95` is commit `f2ae6dbf`, 23 August. The in-app menu, the About page and the Settings device row all report `1.0.1 (Build 95)`, so [issue #1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303)'s version disagreement, found on iOS, does **not** reproduce on Android.
- Device: Samsung SM-A566B (Galaxy A56), Android 16, SDK 36, arm64, WebView 151.0.7922.137. Physical. This is the first physical Android device recorded in the matrix.
- **Bundle cleanliness proven from the artifact rather than assumed.** `base.apk` was pulled off the device and `assets/public` grepped directly: no match for `NX_APP_BITE_TRIBE_IS_DEV:`, no match for `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:`, and `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:"true"` present. Enforced mode is genuinely on in the artifact under test.
- Six commits on `develop` are **not** in build 95, two of which matter here: `171b2e6e` (#1367), which moves local image copies to app-private storage and migrates the legacy public layouts, and `32810c07` (#1384), which adds the menu loading and unavailable states. The shipped bundle still writes to `Directory.Documents`, confirmed by grepping the extracted bundle.

### Methodology - Driving The Device Over adb, And Its One Hard Limit

The run was driven over `adb` with `exec-out screencap` for evidence, `input tap` and `input text` for interaction, and `dumpsys` for OS-level truth about permissions. That combination made it possible to assert things the UI alone cannot show, such as the real state of `POST_NOTIFICATIONS`.

**The limit is worth recording, because it nearly produced a false finding.** Synthetic drags do not drive the app's JS pointer handlers. Three attempts to expand the Bitemap drawer - `input swipe` twice and a hand-built `input motionevent` DOWN/MOVE/UP sequence - all panned the Leaflet map underneath instead, which looks exactly like a hit-testing defect. The tester expanded the same drawer by finger without difficulty. Taps, typed text and scroll flings all work; anything drag-shaped has to be handed to the tester. Bucket-list swipe-to-tick was executed that way.

### What Passed

- **Check 1, registration and the blocking onboarding assistant.** Fresh account registered, the password rules gate behaved, display-name uniqueness reported "Display name is available.", all seven onboarding steps taken, coach marks shown and dismissed, continuation to the home page.
- **Check 2, login, logout and session restore.** Cold start `LaunchState: COLD` at 1378 ms restored an authenticated session with data and no app-level errors. Session restore also survived two process kills caused by permission changes during the run. Logout and login both clean, with preferences intact after re-login.
- **Check 3, Bite creation with a photo, including the failure state and both retry paths.** Created with airplane mode on: offline banner shown, Bite created optimistically, photo tile in the uploading state, reaching `Fotoğraf yüklenemedi` with a `Yüklemeyi yeniden dene` button inside two minutes. That is the failed-photo state and retry workflow from `691fab5e`, verified on Android for the first time. Retry while still offline stayed in the uploading state, and the upload completed on reconnect. The asymmetry between the two is filed as [#1390](https://github.com/muhammedgaygisiz/travellers-apps/issues/1390).
- **Check 4, location and currency.** Selecting an Istanbul restaurant while the device sat in Bern switched the Bite currency prefill from `İsviçre frangı` to `Türk lirası`, and a manual override to Euro and back both held. Separately, and this is the assertion the charter singles out, **onboarding suggested Swiss Franc on a device whose locale is `en-DE` - English language, German region - with time zone `Europe/Zurich`.** The suggestion followed the time zone, not the region variant and not the interface language, which is exactly the case the charter says must hold, tested here for the first time.
- **Check 5, map.** Tiles, clusters, the device position marker, marker selection, and the drawer with full Bite content. Markers paint correctly on a real device.
- **Check 6, search.** Bite, restaurant, city and country all return results. The country picker normalises diacritics, so `turk` matches `Türkiye` and `Türkmenistan`, and paging loads well past the first page.
- **Check 7, bucket lists.** Add, swipe to tick and undo, the tick and undo confirmed by the tester's finger.
- **Check 9, deep links.** `bite-tribe.web.app` reports domain verification state `verified`, and an `https` link fired at a force-stopped app opened the correct Bite detail directly, with no chooser and no cold-start loss.
- **Check 11, restaurant menus and the local gallery.** The China Wok menu renders with sections, items, prices and per-item actions. The local gallery listed exactly the one image created during the run and nothing else.
- **Check 13, the verification-mail resend.** Triggered from the banner and read from the delivered mail: `From: BiteTribe <noreply@bitetribe.app>` and subject `Verify your BiteTribe email address`, in English for an English-language account. The one-word display name confirms the Workspace `Send mail as` name has been updated, which the charter notes only shows up at the recipient.

### Check 12 - App Check In Enforced Mode

The accepted-token half is proven from production Cloud Function logs rather than inferred from the app working. Every `deleteOwnAccount` call from this device logged `{"verifications":{"app":"VALID","auth":"VALID"}}`, against a build whose bundle carries `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:"true"`. Google Places-backed restaurant search worked throughout the run alongside enforced Firebase APIs, which is the evidence [[issue-1245]] asks for. Restaurant search took roughly ten seconds to return, worth watching but not filed.

The refused-token retry gate was not forced and remains an evidence gap, as it does on iOS.

### Check 8 - The Push Permission Gap Against iOS

Onboarding is correct: step 6 raised the real `GrantPermissionsActivity` dialog, and allowing it moved the permission to `granted=true, USER_SET`.

Settings is not. With `POST_NOTIFICATIONS` revoked at OS level, the device row still showed its toggle fully ON, with no blocked-state explanation and no recovery action. On the pre-existing account the same row read ON while the OS reported `importance=NONE userSet=false`, meaning the permission had never been requested for that account at all, and toggling the row off and on raised no prompt.

This is the direct contrast with iOS, where run 6 session 15 recorded that disabling the permission in iOS Settings was recognised, explained, and given an action that opened the right Settings page. **[Issue #1184](https://github.com/muhammedgaygisiz/travellers-apps/issues/1184)'s OS-permission recovery route exists on iOS and does not exist on Android.** Filed as [#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386). Delivery of a ranking-change notification remains unverified, and #1386 is why.

**Since fixed, and not yet verified on a device.** The blocked state, the recovery action and the copy for both already existed - none of it appeared on Android because only `denied` counted as muted, and Capacitor returns a `POST_NOTIFICATIONS` revoked in system settings to an unspent `prompt`. The three symptoms are one assumption: the row's switch now shows what actually arrives rather than the stored `enabled` flag, a muted device is explained, switching it back on asks the OS instead of writing Firestore, and Android has a settings route at last - a native intent in the app's own wrapper, because App Launcher has no URL for it. The reasoning is in [[issue-1386]]. This check is the test that closes it, and it also unblocks the ranking-change delivery check waiting behind it.

### Check 10 - The Blocker That Ended The Run

The privacy policy passes: it renders in-app with full content and a February 2026 date.

Account deletion fails. Both confirmation gates passed, then "We could not delete your account. Please try again.", with the account still present. Reproduced twice by the agent and once independently by the tester.

The diagnosis was closed from three directions rather than left as a symptom:

- **Production logs.** Every attempt verified cleanly, then threw before the function's own logging. No `account deletion failed` and no `account deleted` entry follows any of them. The last successful deletion in the logs is 15 August, from the web run.
- **The server source.** `delete-own-account.ts:50` sets `REAUTH_MAX_AGE_SECONDS = 5 * 60`, and `assertRecentSignIn` throws `failed-precondition / reauth_required` beyond it. Every attempt was outside the window - the tester's by about 24 minutes, the agent's by four hours - so the backend behaved exactly as designed.
- **The client source, plus what was on screen.** The delete page describes the account as "Signed in with a linked account", which is the i18n key `delete-account-identity-method-unknown`. `signInMethod` resolved to `unknown` for an account registered with an email and a password, and it still did so immediately after a fresh password login, so this is constant on Android and unrelated to session age. `getProviderId` reads `user.providerData?.[0]?.providerId`, which returns an unmapped value, so the guard that would collect the password never fires and the flow falls into a re-authentication that cannot succeed.

Net effect: **the Android client resolves the sign-in provider to `unknown`, so it can never answer the backend's `reauth_required`.** The five-minute window is the backend working as designed; the defect is that the app cannot satisfy it, and fixing the window would only widen the gap in which the bug is invisible. Store policy and GDPR both require a working deletion, so this is a release-candidate blocker. Filed as [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385).

**Corrected twice, and the second correction matters more than the first.** The initial write-up implied deletion succeeds inside the five-minute window. It does not: the tester ran a deletion **inside** the window and it failed as well. That is direct evidence, and it means the re-auth path is not the only fault, because inside the window `assertRecentSignIn` passes and the provider is never consulted. The agent's earlier inference - that every call reaching the server was outside the window - assumed the tester's attempt was among the four calls it had seen in the logs, and should not be treated as established. Re-reading the logs to settle it is blocked by Google Cloud rate limiting.

**The root cause of the misidentification, since confirmed.** On Android, `FirebaseUser.getProviderData()` includes the Firebase user record itself, with `providerId` of `firebase`, before the real providers; iOS and the web SDK do not. `getProviderId` read index 0 unconditionally, so on Android it returned `firebase`, which is unmapped, giving `unknown`. That matches every observation: constant on Android, still wrong immediately after a fresh login, and correct on iOS. The `?? 'password'` fallback could not save it, because index 0 is present with the wrong value. The device log this section asked for was not needed in the end: the behaviour was read out of the shipped `firebase-auth-24.0.1.aar`, where the only `FirebaseUser` implementation appends the reserved entry to the list `getProviderData()` returns and filters it out of the separate provider-id list only. The fix and its reasoning are in [[issue-1385]].

**Still unexplained: the inside-window failure.** Three candidates, cheapest first - the call never reaches the server (no new function-log entry at all); it reaches the server and `deleteAccountForUser` fails (`account deletion failed` logged); or `auth_time` is not refreshed by the native `signInWithEmailAndPassword`, which would make the window unsatisfiable on Android and fold both symptoms into one auth-state problem. One attempt inside the window with the function log read immediately afterwards separates them. **The provider fix does not close this**, because inside the window `assertRecentSignIn` passes and the provider is never consulted, so the check is still owed. The third candidate is the weakest of the three: `auth_time` is minted by Firebase Auth on the sign-in itself rather than by the client, and an attempt that followed an app launch on a restored session would carry the old `auth_time` on any platform.

Why no earlier run caught it: the iOS runs deleted within minutes of signing in, so the re-auth branch was never exercised. **Whether iOS resolves `providerData` correctly is untested**, and it should get the same stale-session test before #1385 is treated as Android-only.

### Monitoring

- **Crashlytics** initialises correctly - `Initializing Firebase Crashlytics 20.0.3` on every cold start - but a non-fatal was not triggered before the run stopped. Not verified.
- **Analytics is an evidence gap, not a pass.** With `debug.firebase.analytics.app` set, logcat reports `App measurement disabled by setAnalyticsCollectionEnabled(false)` and no event logging follows. The only call site in the repo is the DEV-only branch in `provide-firestore-utils.ts`, which build 95 cannot reach, and nothing anywhere calls `setEnabled({ enabled: true })`. Filed as [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387).

  **Since confirmed and fixed, and not yet verified on a device.** The suspected mechanism was read out of the shipped SDK: `play-services-measurement-impl` keeps the flag in the `com.google.android.gms.measurement.prefs` SharedPreferences file under `measurement_enabled`, so a dev build's disable outlives the process, the build, and the install that wrote it - and `android:allowBackup="true"` puts it inside auto-backup's default set, so even clearing app data may not undo it. Production now states the flag: the non-dev path calls `setEnabled({ enabled: true })` on native platforms. The transport question is answered too, and it is native - `AnalyticsService`, `setCurrentScreen`, `setUserId`, and the App Check telemetry all go through `@capacitor-firebase/analytics`, so the disabled flag was silencing the app's own events, not only the auto-collected ones. The one call that disagreed, `FirebaseErrorHandlerService`'s `exception`, went through the JS SDK on every platform and now branches with the rest. The reasoning is in [[issue-1387]]. **Build 95 cannot be used to check this**: only a build carrying the fix repairs the device.

### Two Cross-Platform Results Worth Keeping

- **Confirmed.** The iOS observation that the onboarding location step ignores an already-granted permission reproduces exactly on Android: step 5 opened offering `Share my location` with `Next` disabled while `ACCESS_FINE_LOCATION` was already `granted=true`, whereas step 6 recognised its grant as soon as it existed. It is a shared behaviour of the assistant, not an iOS quirk.
- **Refuted for Android.** Run 7's web finding that the local gallery is not scoped to the account does **not** hold here. Under the first account the gallery listed exactly the image written to `/sdcard/Documents/<firebase-uid>/`, and after registering a second account it showed the empty state while the first account's file was still on disk. The scoping defect is web-specific, and that should be checked before any fix is designed from the web finding.

### Findings Filed

Eleven issues, all added to the board with a priority:

| Issue                                                                    | Priority | Subject                                                         |
| ------------------------------------------------------------------------ | -------- | --------------------------------------------------------------- |
| [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385) | P0       | Account deletion fails outside the five-minute re-auth window   |
| [#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386) | P1       | Push settings do not reflect or recover the OS permission       |
| [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387) | P1       | Native analytics stays disabled on devices that ran a dev build |
| [#1388](https://github.com/muhammedgaygisiz/travellers-apps/issues/1388) | P2       | Turkish uppercase drops the dotted İ                            |
| [#1389](https://github.com/muhammedgaygisiz/travellers-apps/issues/1389) | P2       | Restaurant tags not deduplicated across the `#` prefix and case |
| [#1390](https://github.com/muhammedgaygisiz/travellers-apps/issues/1390) | P2       | Offline photo upload retry never times out                      |
| [#1391](https://github.com/muhammedgaygisiz/travellers-apps/issues/1391) | P3       | A typed Bite tag is lost unless a space is pressed              |
| [#1392](https://github.com/muhammedgaygisiz/travellers-apps/issues/1392) | P3       | Bitemap drawer has no bottom safe-area spacing                  |
| [#1393](https://github.com/muhammedgaygisiz/travellers-apps/issues/1393) | P3       | Action sheet lists Cancel before the real actions               |
| [#1394](https://github.com/muhammedgaygisiz/travellers-apps/issues/1394) | P3       | Use the Android Photo Picker for the gallery path               |
| [#1395](https://github.com/muhammedgaygisiz/travellers-apps/issues/1395) | P3       | Legacy unscoped image copies remain in public Documents         |

Four of these came from the tester noticing something while the agent was driving - the drawer spacing, the tag duplication, the double photo selection and the tag-commit rule - which is worth recording as a methodology point: the matrix did not ask for any of them.

### Run 9 Outcome

**Release-candidate fail for the Android half**, on one P0, [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385). The run was stopped at that point by decision rather than completed, so the Android half is also incomplete.

Executed and passed: checks 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, and the accepted-token half of 12. Partial: check 8, where onboarding passes and Settings fails. Failed: check 10's deletion half.

Not executed, recorded rather than silently skipped: delivery of a ranking-change notification; the App Check refused-token retry gate; a Crashlytics non-fatal; Analytics DebugView, blocked by #1387; the location-denial and no-signal edge cases; and the business app, which remains unscoped for this release candidate.

### Run 9 Cleanup Inventory

Left in place at the end of the run, deliberately recorded because a later run will meet them:

- The test Bite `Run9 Test Bite` at Kayseri Mantı Evi, Ümraniye, still live on the tester's own account, along with its local copy under `/sdcard/Documents/3HaVavOKbzRuNjg6p2ceUAH0pgh2/` and its Gallery entry.
- The throwaway account `Run9 Tester` still exists, because #1385 prevented its deletion. It can be removed by signing in and deleting within five minutes, which is also the clean confirmation test for #1385.
- The device is signed out of the tester's own account.
- `debug.firebase.analytics.app` is **still set** on the device. The clear was attempted at the end of the run but the device had already been disconnected, so it is still pending: `adb shell setprop debug.firebase.analytics.app .none.`
- Photo access was granted as "Allow limited access" during the run and was not revoked.
- 115 legacy image copies remain in public `/sdcard/Documents`, which is [#1395](https://github.com/muhammedgaygisiz/travellers-apps/issues/1395).

## Web Execution - Build 95 at `a20f485a` (Run 8)

### Entry State And Build Identity

- **Run 8 is web only, by decision.** Its purpose was to re-run the web half against the fixes Run 7's findings produced, and to finish the surfaces Run 7 left unexecuted.
- **The build number does not distinguish this deploy from Run 7's, and that is structural.** The deployed app reads `version: "1.0.1", buildNumber: "95"` — the same identity string Run 7 tested — because `buildNumber` comes from the native projects and only moves at release prep. Between the two runs `develop` gained eight fix commits and CI redeployed. **A web run must therefore record the commit, not the build number.** This one is `a20f485a`.
- **The commit was established from the served assets rather than assumed.** The deployed `assets/i18n/en.json` is key-for-key and value-for-value identical to `develop` at `a20f485a`, including the three keys PR #1340 added, and CI for that commit deployed successfully on 15 Aug at 19:30.
- **The deployed bundle passes the production-cleanliness check, and the mechanism is worth stating precisely.** The inlined environment object in `chunk-6I76E3EN.js` carries no `NX_APP_BITE_TRIBE_IS_DEV`, no App Check debug token and no `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED`. Those three names **do** appear in `chunk-D3MU23YL.js`, as the runtime lookup keys the code reads them by (`u.NX_APP_BITE_TRIBE_IS_DEV !== "true"`), and `FIREBASE_APPCHECK_DEBUG_TOKEN` appears in the App Check SDK chunk as its own global. A future run greping for those strings will get hits; absence means absence **from the environment object**, which is the only place a value could live.

### Methodology Confirmed And Two New Techniques

- **Run 7's browser rule holds.** The whole run was driven by automation in an ordinary Chrome profile with no App Check trouble: `accounts:signUp`, `updateUserMetadata`, `syncEmailVerificationStatus`, `loadBitesByLocation` and Firestore `Listen` all succeeded under active server-side enforcement, with no 403 and no `appCheck/initial-throttle`. The instrumented browser remains the thing to avoid, not the automation.
- **New: `Set manually` is how the web half reaches a foreign Bite position.** Run 7 recorded #1307 as unreachable on web for want of any way to make the Bite position differ from the device position. The position-source modal's `Set manually` option is that way — zoom the modal map out (mouse-wheel events work where clicking `−` repeatedly is slow) and click another country. This unlocks the whole class of vacation-usage and posting-later edge cases the charter lists as never deliberately tested.
- **New: Storage can be listed from the signed-in page, with its own control in the same call.** `GET https://firebasestorage.googleapis.com/v0/b/<bucket>/o?prefix=images/bites/<id>/` with the user's `Authorization: Bearer <idToken>` **and** the SDK's App Check token from the `firebase-app-check-database` IndexedDB store. Run 7 had to recover a deleted Bite's id from the local gallery and read the console; this needs neither. Always pair the folder under test with a live Bite's folder in the same call, so "empty" is a result rather than a wrong path.
- **That attempt also produced unplanned App Check evidence.** The identical request _without_ the App Check header returns `401 Firebase App Check token is invalid`. Backend enforcement is therefore demonstrably live on **Storage**, not only on Firestore — a gap [[Current State - Known Issues]] listed as unevidenced. It still says nothing about the client-side enforced-mode gate, which needs a build with the flag on.

### The Six Run 7 Findings

All six are fixed. Each was verified against the specific claim its issue made, not merely by its closed state on GitHub — the rule that caught #1232 in Run 5 and refuted #1265 in Run 6.

- **[#1326](https://github.com/muhammedgaygisiz/travellers-apps/issues/1326), onboarding step 2 — fixed.** The step arrives with `Stay private` reporting `checked: true` **and** `Next` reporting `disabled: false`, with nothing clicked. Run 7's failure was the second half of that pair. The run then advanced by taking the default, which is the exact path that dead-ended before.
- **The fix records the default as a real answer rather than only enabling the button, and step 5 proves it independently.** The location step's home-city note read `Your profile is private, so your home city stays off public surfaces…` — the private variant, derived from a step 2 choice the user never touched. Onboarding completed to `/home`, and the profile still showed `Private profile` after a Bite creation and a navigation round trip.
- One UI detail for future runs: that visibility note only renders once the location decision is made, so it is absent on arrival at step 5 and present after `Share my location` or `Not now`.
- **[#1327](https://github.com/muhammedgaygisiz/travellers-apps/issues/1327), eager delete alerts — fixed, and verified in both directions.** `/home` with 51 cards holds **0** `ion-alert` where Run 7 counted 50, and total DOM nodes fell from **2305 to 1654** for the same feed. Invoking delete creates exactly one alert; dismissing it returns the count to 0, so the `@if` tears down as well as defers.
- **The remaining per-card overlay is the rating modal, and it is not the same defect.** `/home` instantiates 51 `ion-modal` elements, but each is an empty host with a 4-node shadow root and its content deferred behind `ng-template` — about 204 nodes in total. That is why the alert was the expensive one: Ionic alerts render their content eagerly, modals with a template do not. Recorded so a future run does not re-file this as #1327 reopened.
- **[#1328](https://github.com/muhammedgaygisiz/travellers-apps/issues/1328), the unscoped local gallery — fixed, with the strongest evidence of the run, because Run 7's own residue was still on disk.** This Chrome profile still held Run 7's **13 unowned files** at the `Documents` root, including `bites_9afeaf5e-…jpg`, the image named in Run 7's cleanup inventory. After the new account's first gallery read: the gallery said `No locally saved images found.`, and the Capacitor filesystem held **exactly one entry**, the uid-named directory. All 13 legacy files were **deleted** rather than adopted, which is the correct browser branch. This also discharged a real exposure that had been sitting in the profile since before Run 7.
- **The cross-account half was then verified in its hardest form.** The new account posted one photo, which landed at `Documents/<uid>/bites_4a1a7aea-…jpg` — never at the root. The account was then deleted, and the file **survived the deletion**. Signing in as the main account produced an empty gallery with the previous user's photo still physically present on disk. A "clear on logout" would not have held here: the file survived a logout, an account deletion, and outlived the account itself. Scoping the read is what holds.
- One housekeeping consequence, recorded rather than filed: the orphan `Documents/<deleted-uid>/` directory stays in the browser profile, unreachable by any account and invisible in the UI. There is no exposure, and `Delete all` only reaches the signed-in user's own directory, so orphan directories accumulate until browser data is cleared.
- **[#1329](https://github.com/muhammedgaygisiz/travellers-apps/issues/1329), the raw `name` sort chip — fixed by removal, as decided.** The chip is gone from `My Bucket Lists` entirely. Its replacement works: placeholder `Search bucket lists...`, a matching term keeps the list, a non-matching term gives `No bucket lists match “zzzznothing”.` with `Clear search`, and an account with no lists gets `No bucket lists yet. Create your first one.` — a state the page previously had **no copy for at all**.
- **[#1330](https://github.com/muhammedgaygisiz/travellers-apps/issues/1330), the full-width searchbar — fixed.** Measured at a 1470px viewport: `720px` with `max-width: 720px`, against Run 7's `1408px` with `max-width: none`. Its **alignment** is now the subject of [#1344](https://github.com/muhammedgaygisiz/travellers-apps/issues/1344), below.
- **[#1331](https://github.com/muhammedgaygisiz/travellers-apps/issues/1331), empty-feed copy for an empty search — fixed, both branches.** With a term: `No bites match “zzzznothing”.` plus `Clear search`, and the empty-feed element absent from the DOM. Without a term, on an account that genuinely has none: `No bites found. Be the first one.` `Clear search` flips it back. The same distinction held after the run's Bite was deleted, where the empty-feed copy is the correct one.

### #1325 And #1307, Carried Over From The iOS Half

- **[#1325](https://github.com/muhammedgaygisiz/travellers-apps/issues/1325), the position marker's colour — fixed, with better evidence than either previous run produced.** The form's marker was read as a computed background colour per source: `From GPS` → `rgb(31,111,235)` (BLUE), `From restaurant` → `rgb(47,143,78)` (GREEN), `Set manually` → `rgb(124,58,237)` (PURPLE). The modal's legend dots match all five entries of `POSITION_SOURCE_COLORS` exactly, including `From photo` RED and `From Google` ORANGE. Run 7's diagnosis was that the form "does not read the source colour at all"; three sources now render three colours, and modal and form agree inside a single capture where Run 7 caught them disagreeing.
- **[#1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307), restaurants sourced around the device — fixed, and reachable on web for the first time.** With the Bite positioned in Verona and the device in Bern, the restaurant picker offered **zero** Bern candidates and five Italian ones under `Nearby on Google Maps`, each labelled with **both** distances: `0.8 km from the Bite` and `323.3 km from you`. That is `getRestaurantsNearBite` emptying the 15 km local list and `hasRestaurantNearBite` correctly letting the Google lookup run. Stating both distances in the row is what makes the fix self-evidencing.
- **A charter check fell out of it that had never been exercised on web: the price currency prefill.** Moving the position to Italy flipped the form's currency from `Swiss Franc` to `Euro` immediately. The account default currency remains a separate check with a separate source; see [[issue-1262]].
- The resulting Bite deliberately paired a Bern restaurant with a Verona position, so its card read `JOHNY'S ROAD KITCHEN` above `PROVINCE OF VERONA, ITALY`. That mismatch is the fixture, not a defect.

### #1334, Which No Run Had Checked

- **[#1334](https://github.com/muhammedgaygisiz/travellers-apps/issues/1334) is fixed, and it was verified without altering the social graph.** The `Following` list holds **0** alerts across 51 rows with nothing pending. Clicking `Unfollow` on **row 2** opened exactly one alert reading `Are you sure you want to stop following @Abreham?` — the row clicked, not `@Zehraxkm`, the last row the pre-fix code would have unfollowed. `Cancel` left 51 rows intact and tore the alert down.
- Worth keeping as a method: a confirmation dialog's binding can be verified by reading the alert's `message` and then cancelling. Nothing destructive is needed to prove which row a dialog is bound to.

### Both Playwright Suites, Executed For The First Time

- Run 7 recorded the suites as not run. They were run here, serially, never overlapping, because they share the emulator ports.
- `npx nx e2e bite-tribe-e2e --workers=1` → **39 passed** in 4.8 minutes, exit 0.
- `npx nx e2e bite-tribe-business-e2e --workers=1` → **1 passed** in 20.1 seconds, exit 0. The business suite contains a single test, `opens a restaurant from the dashboard`, which is the measure of its coverage rather than a result to take comfort from.
- Neither needed manual setup: `playwright.config.ts` starts the emulators and the Angular dev server itself, and `apps/bite-tribe/.env` already carries the dev flags.

### Bite Lifecycle And Account Deletion

- **Both toasts were captured as live objects.** Create → `Bite created successfully!`, `color: "success"`, `position: "top"`. Delete → `Bite deleted successfully!`, same attributes. #1305's success path is now verified on two actions on two consecutive web builds.
- **[#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310) is bidirectional here too**: the profile Bite count read `1` after creation and `0` after deletion.
- The rating is the gate on `Post`: a photo, a dish name and a price left the button disabled.
- **Storage went with the explicitly deleted Bite.** `images/bites/4a1a7aea-…/` returned `items: 0` while a live feed Bite's folder returned `items: 1` in the same call. This corroborates Run 7's reading that Run 5's "Bite images are kept" observation belongs to the **account-deletion cascade**, where Bites are anonymised rather than removed, and not to an explicit Bite deletion.
- **A wrong password on the deletion re-auth proved a safety property that had only ever been asserted.** The attempt failed, and `accountDeletions/{uid}` was **404** afterwards: no job document, so the cascade never started. `assertRecentSignIn` throws before `deleteAccountForUser`, exactly as that function's comment claims — "a failure always leaves a signed-in user who can retry, never an orphaned data set nobody can reach".
- **The deletion audit record is worth reading after a deletion.** After the successful attempt, `accountDeletions/{uid}` held `status: completed`, an 8.1-second span, `deletedBucketlists: 1` and every other counter `0` — `anonymizedBites: 0` because the Bite had been deleted explicitly first. The document is a precise, self-consistent account of what the cascade touched, and it confirmed the bucket list went with the account as the deletion screen promised.
- **The display-name reservation is released, re-verified.** `displayNames/run8web` returned **404** after deletion, `users/{uid}` likewise, with the signed-in main account's own document returning 200 as the control.
- The three-step flow itself behaved as Run 7 documented, including the re-authentication prompt restating `run8web · muhammed.gaygisiz@bitetribe.app`.

### Findings

- **[#1343](https://github.com/muhammedgaygisiz/travellers-apps/issues/1343), `P2`: the profile page's unfollow dialog is hardcoded English.** `profile.component.html` builds `header="Stop following"` and its message as literals, while the followers list renders the same dialog through `'stop-following' | transloco`. Both keys exist and are translated in all eleven locales, and the component already uses Transloco five times elsewhere. A user in any of the other ten locales gets English from a profile page and their own language from the followers list. The hardcoded string also drops the `@` prefix the translated one applies.
- **Found only because #1334 was being verified.** Counting alerts on the `Following` page returned one more than expected; it belonged to the retained profile page behind it. The eager-alert pattern that #1327 and #1334 fixed has two remaining occurrences — `profile.component.html` and `edit-profile.page.html:145` — recorded on #1343 as a secondary point, since it is the same element.
- **[#1344](https://github.com/muhammedgaygisiz/travellers-apps/issues/1344), `P3`: the `My Bites` searchbar is flush left while the chip row above it is centred.** Noticed by the tester, then measured: `My Bites` reuses the home component whose desktop column widens to 1440px, so its capped 720px field sits at `x = 31`, while `My Bucket Lists` sits in its own 720px column and is centred. The stronger argument is within the page rather than between pages — the `Filter` / `Bitemap` / `Distance` chips directly above the field are centred. PR #1341 chose flush-left deliberately, to stay flush with the feed grid, so the issue records that it reverses a decision rather than fixing a slip.

### Raised And Dismissed By Decision

- **The generic failure message on a failed deletion re-auth is intended.** A wrong password produces `We could not delete your account. Please try again.`, the same string as an unknown backend failure; the service knows the difference internally and analytics records `reason: 'reauth_failed'`. Raised as a finding on the grounds that the anti-enumeration rationale does not apply on a screen that already names the account, and that Apple, Google and GitHub re-auth prompts do say the password is wrong. **Dismissed by the tester by decision**: the generic message is deliberate so that whoever is trying cannot confirm a guess, and the app has no specific credential-error copy anywhere — only `something-went-wrong-please-try-again` — so this is a consistent house pattern rather than a gap in one flow. "Please try again" is also correct advice for a wrong password. Recorded here because nothing documented the intent, which is exactly why it read as a defect.
- **A correction to how #1265 has been described.** [Issue #1265](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265) is the mail sent by the **resend button**, through the Cloud Function and Gmail delegation. It is **not** the registration mail, which Firebase Auth's own template sends from `noreply@bitetribe.app` and which is fine. Registration in this run fired `sendOobCode` and so exercised the _correct_ sender path; that is not evidence about #1265. Retesting #1265 means triggering the resend button and reading that mail's `From` header.

### Web Outcome

- **Result: pass for the web half.** All six Run 7 web findings are verified fixed, #1325 and #1307 are verified on web, #1334 is verified for the first time, both Playwright suites are green, and no `P0` or `P1` finding is outstanding against the web app. The two new findings are `P2` and `P3`.
- **Every Run 7 fix held on first inspection.** That is worth stating because it is not the usual outcome in this charter: Run 5 caught #1232 closed-but-broken, and Run 6 refuted #1265's shipped fix. Eight fixes were checked here and none was refuted.
- **The two new findings came from the two methods this charter keeps arguing for, and again neither method would have found the other's.** #1344 came from the tester looking at the screen and asking why something seemed off. #1343 came from counting DOM elements and reading source — nobody driving the app in English could see it.
- **Still not executed on web**: anything behind a Business app login, **recorded as out of scope for Run 8 by decision**; the business app has a single Playwright test and no manual coverage. Safari has never been exercised on any run. The client-side App Check enforced-mode gate still needs a build with the flag on.
- **The web half's build identity problem is now recorded rather than latent.** Runs 7 and 8 both read `1.0.1 (95)`, and only the commit distinguishes them. Any future web row must carry the commit.

### Run 8 Cleanup Inventory

- **The `run8web` account was deleted at the end of the run**, by the tester, through the app's own three-step flow. Its display-name reservation is released and its user document is gone.
- **It created one Bite, `Run 8 Web Test Bite`**, positioned in Verona with a `RUN 8 WEB TEST / gallery scoping probe / delete me` placeholder image, and **deleted it before the account**. The profile count confirmed `0`, and the Storage folder `images/bites/4a1a7aea-fb4d-4ab7-bab6-bc4197373841/` was verified empty against a live Bite's folder as a control.
- **One bucket list, `Run 8 Search Fixture`**, went with the account: the deletion record reports `deletedBucketlists: 1`.
- **Nothing was posted to or about any other user.** The #1334 verification stopped at the confirmation dialog and cancelled, so no follow edge changed.
- **Two local-only residues remain in the tester's Chrome profile**, neither reachable by any account: the orphan `Documents/<run8web-uid>/` directory with its one photo, and the empty `Documents/<main-account-uid>/` directory created on sign-in. Run 7's 13 unowned root files are **gone**, deleted by #1328's fix during this run.

## iOS Execution - Build 94 (Run 7)

### Entry State

This section is written **before** execution. Everything below is either build provenance or a carried-forward commitment; nothing here is an observation, and no check is pre-recorded as passed.

- **Build provenance is known before execution, for the second run running.** Build 94 is source commit `4fdf021d`, tag `build-1.0.1-94`, changelog range `a2753b18..4fdf021d`, recorded in release PR [#1324](https://github.com/muhammedgaygisiz/travellers-apps/pull/1324). The tag points at the bump commit rather than the released source, which is the standing gap in [[Release Workflow]], so `4fdf021d` is the SHA to trust.
- The TestFlight `What to Test` copy submitted with this build reads: `Bug-fix release. Your profile Bite count now updates as soon as you create a Bite. The reply field has room to type, the position picker shows your selection, alerts close on back, and your BiteTribe display name is used.` Confirm it matches what the device shows before starting, as in Run 6.
- **Build 94 is a bug-fix release with no features.** Six fixes and two refactors, against build 93's eight features plus fixes. The run should be weighted accordingly: this is a verification run over Run 6's findings, not an exploration of new surface.
- **The single Run-6 blocker is fixed in this build, and it is the priority of this run.** [Issue #1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308), reviews publishing the author's legal name, is closed against PR [#1312](https://github.com/muhammedgaygisiz/travellers-apps/pull/1312). Read the fix before testing it, because its shape decides what counts as evidence:
  - The **write path** now stores the BiteTribe display name from the user document instead of `user.displayName` from the Google or Apple sign-in.
  - The **read path** additionally overrides the stored `author` string by resolving `authorId` against the user document, so reviews written before the fix also render the display name. A display-name change now retroactively shows on older reviews, which is itself worth one observation.
  - **The legal names already written to Firestore are still there.** The fix hides them at render time rather than cleaning them, so the PII at rest is unchanged and there is no backfill in this build.
  - Consequently there is a residual disclosure path to test deliberately: a review whose `authorId` cannot be resolved — a deleted account, or a review written before `authorId` was carried — **falls back to the stored name**, which for a Google or Apple author is still the legal name. Run 6's own cleanup deleted two accounts, so fixtures for this case may already exist. If the fallback is reachable, #1308 is not fully closed and that must be filed rather than absorbed.
- **Build 94 carries fixes for seven of the eight issues Run 6 filed.** [#1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303) version `0.0.0` (PR #1314), [#1304](https://github.com/muhammedgaygisiz/travellers-apps/issues/1304) the deleted-Bite alert outliving its page (PR #1315), [#1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305) toast position and failure signalling (PR #1316), [#1306](https://github.com/muhammedgaygisiz/travellers-apps/issues/1306) the position source modal (PR #1320), [#1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308) as above (PR #1312), [#1309](https://github.com/muhammedgaygisiz/travellers-apps/issues/1309) the reply field (PR #1321), and [#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310) the stale profile Bite count (PR #1322). Closure state on GitHub does not replace physical verification — the rule that caught #1232 in Run 5 and refuted #1265 in Run 6.
- **Two issues are knowingly not fixed in this build**, and must not be re-filed as new findings:
  - [#1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307), restaurant suggestions drawn from the device position rather than the Bite's, is open and no fix is in this changelog range. Expect it to reproduce.
  - [#1265](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265), the verification mail sender, is open and was reclassified in Run 6 as a configuration issue rather than a code one. Nothing in build 94 changes it.
- **#1303 deserves a specific check because its fix moved a source of truth.** The app reported version `0.0.0` because the version was read out of the native projects; it now comes from `package.json` through the build-time inline, with `App.getInfo()` preferred on a native build. The build 94 bundle inlines `version: "1.0.1"` and `buildNumber: "94"`, verified in `dist` before wrapping. The observation to record is what the app menu, the About page, and a **newly written** user document's `appVersion` all report — the last one is what #1303 was actually about, and a user document written before the fix keeps its wrong value.
- App Check runs under the transitional policy on this artifact. See the note under Build Under Test: the enforced-mode startup gate is not applicable to this build rather than passed, and the refused-token evidence gap therefore cannot close on this run either.
- **Entry inventory.** Run 6 left nothing of its own behind — no live disposable account, no test Bites, no Storage objects. The only standing inventory is Run 4's: three anonymised Bites and their two Storage objects, which must not be removed. This run consequently starts **without** a pre-onboarded disposable account, unlike Run 6, so it must create its own and delete it at the end.
- The device app container still holds the Run-4 local gallery. Run 6 cleared it for release: it existed as a fixture for #1232, which is verified fixed. A run needing that path again must manufacture the fixture.
- If build 94 installs **over** build 93 rather than as a fresh install, the same three consequences as Run 6 apply and should be restated rather than reasoned out again: the container survives, existing permission grants survive so prompts appear only where one is deliberately revoked, and first-run install behavior is out of scope. Record which of the two actually happened.
- **Evidence gaps carried forward from Run 6**, none of which build 94 addresses. They are listed so the run either closes them deliberately or records them as still open, rather than rediscovering them: localized permission prompts verified in the artifact but never at runtime, because an English-first device cannot distinguish a working localization chain from an absent one; a **successful** `Erneut versuchen`, never observed because the Bite used was deleted; #1273's login pending state, never exercised because no password sign-in happened; the refused App Check token, which needs an invalid-token artifact and is now doubly blocked by the flag being off; and Analytics DebugView, which needs a dedicated Xcode debug launch.
- **Never executed in any run up to this point**, and outstanding when this entry state was written: Bucket Lists, menu drafts, the privacy policy, the web deep link, follower push tap, production Analytics Realtime, the Business app, and the Android and web halves, plus the Playwright suites. **Several of these were then covered by the web half later in this same run** — Bucket Lists, the privacy policy, the web deep link, and the Business app's build identity — so read this list as the state at iOS execution time, not as the run's conclusion. What remains untouched by any run is **Android**, menu drafts, follower push tap, production Analytics Realtime, the Business app's authenticated surface, and Playwright.
- Issue triage goes on the `Bite Tribe` project board, not in labels: add the issue to the board, then set the `Priority` field. To reopen a closed issue, move its board `Status` off `Done` **first**, or the auto-close workflow will close it again within minutes. Both conventions are in [[GitHub Project Board And Issue Handling]], which this charter defers to.
- Result: executed. Release-candidate pass for the iOS half, with one minor finding. See the Run 7 Outcome section below.

### Session 1 - Build Identity, Device Identity, And The Version Chain

- **Methodology change, recorded because it applies to every observation in this run.** Run 6 captured the iPhone Mirroring window by window id with `screencapture -l`. That was not reproducible this run: the window id needs `CGWindowListCopyWindowInfo`, and neither a Quartz-capable Python nor accessibility permission for `osascript` was available, so window bounds could not be queried at all. The run instead captures a **fixed screen region** with `screencapture -R 322,128,285,615`, which yields a 570x1230 pixel image of the mirrored device. Copy is legible at that size and every observation below has its own artifact. Run 6's constraint still applies and was respected: the window sits on the MacBook's built-in display. Device input still cannot be injected, so every interaction was performed by the tester.
- TestFlight showed `BiteTribe 1.0.1`, `Build 94`, developer Muhammed, expiring in 90 days, with the action reading **`Open` rather than `Update`**, which is what establishes 94 as the installed build rather than one merely available.
- The TestFlight `What to Test` copy matched the notes submitted with the build: `Bug-fix release. Your profile Bite count now updates as soon as you create a Bite. The reply field has room to type, the position picker shows your selection, alerts close on back, and your BiteTribe display name is used.`
- Device identity is **unchanged from Run 6**: iPhone 12 mini, iOS 26.6. The OS did not move between builds, so it is not a variable in this run's comparisons with Run 6.
- Authenticated cold start after a force quit settled **directly on the Bites list** with the stored session restored, no login bounce, and **no stray alert, modal, or toast** over the top. German locale intact, and build 93's distance feature still rendering (`0.25 KM`).
- **[Issue #1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303) is verified on all three surfaces it touched.** The app menu reads `Version 1.0.1 (Build 94)`; the About page reads the same, so the version resolves consistently in both places rather than one being fixed and the other not; and the user document in Firestore holds `appVersion: "1.0.1"` with `appBuildNumber: "94"`.
- The user-document half was reachable only by luck of timing, and the next run should not assume it will be. `updateUserMetadata` is **throttled to once per day per user**, in Capacitor Preferences keyed by uid, persisted across restarts. Build 94 was installed over 93 so the container and the throttle state both survived; the write happened to have aged past its 24-hour window before this run began. Had it not, no number of cold starts would have refreshed the document and the check would have needed a fresh registration instead.
- **Direct evidence that #1303 does not repair what is already stored.** A different, real user's document — one still on build 86 — reads `appVersion: "0.0.0"`. The fix stops the bad write; it does not clean documents written before it. `appVersion` is therefore unusable as a build census until every user has updated, which is worth knowing because diagnosing builds already in the field is the entire reason that field exists.

### Session 2 - #1308, The Run-6 Blocker

- The main account has **no reviews at all**: a `reviews` query on `authorId ==` its uid returned zero results. This matches Run 6's cleanup inventory, which recorded that the main account's only review went with the anonymised `Run 6 Test` Bite. The obvious fixture for this check no longer exists, and the next run should expect the same.
- A valid fixture was found instead, and its properties are what make the evidence strong. Review `1yObEczNoAFNZe1wpPBp` stores `author: "Kristina Farrrugia"` with an `authorId` present, `createdAt: 2025-06-09T07:31:01.103Z` — written **over a year before the fix existed** — on Bite `nF2XbGwdakGN2BFsMZYL`, `Börek` at `Bash Burek` in Prizren.
- That author's user document reads `displayName: "Kristina"` and `fullName: "Kristina Farrugia"`. The stored review string is therefore the legal name and **differs from the display name**, which is what makes the test decisive: on a document where the two coincide, a working override and a broken one are indistinguishable.
- **On the device the review renders `Kristina`.** The read-time override fires on pre-fix data, so #1308 is fixed for historical reviews and not merely for new writes. The reply affordance labels itself `Antwort an Kristina`, so the resolution covers that surface too.
- **The PII at rest is unchanged, as predicted in the entry state.** Legal names remain stored in the `author` field of existing reviews; the fix hides them at render time. No backfill shipped in this build.
- Incidental evidence for [issue #1296](https://github.com/muhammedgaygisiz/travellers-apps/issues/1296): search located this Bite **1174 km from the device** by place name, with no proximity assumption. The review timestamp rendered as the localized relative string `letztes Jahr`.

### Session 3 - #1309, The Reply Field

- The reply field held **three full lines** of typed text with all of it visible, the box having grown to fit. [Issue #1309](https://github.com/muhammedgaygisiz/travellers-apps/issues/1309) was that the field showed almost nothing, so this is a clean pass.
- **The reply was deliberately not sent.** Posting it would have published a public reply on a real user's review and push-notified her, which is a live third-party side effect for a check whose defect was the field's size. `Abbrechen` closed the field with nothing posted. The reply **send** path is consequently not covered by this run.

### Session 4 - Bite Creation: #1306, #1305, #1310

- A photo taken in Ronda, Spain was used deliberately, so the photo's EXIF position and the device's position in Bern are ~1800 km apart and a wrong source selection is visible at a glance.
- **[Issue #1306](https://github.com/muhammedgaygisiz/travellers-apps/issues/1306) is verified, across three independent signals.** The modal opened with a checkmark on `Aus Bild` and the map centred on Ronda. Selecting `Aus GPS` **moved the checkmark**, recentred the map to Bern, and **changed the marker colour from red to blue**, matching the source dots in the list. A static badge sitting permanently on the first entry would have produced the first screen but not the second.
- Unavailable sources are greyed with reasons rather than silently disabled: `Aus Restaurant` as `Kein Restaurant gewählt`, `Aus Google` as `Kein Google-Ort gewählt`.
- After the restaurant `Toro Tapas Ronda` was chosen, the modal showed `Aus Google` promoted from greyed-out to selected, and drew **two markers at once** — orange for the Google place, red for the photo position, at visibly different points in Ronda. The modal renders every candidate position in its own source colour and checkmarks the chosen one.
- **[Issue #1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307) reproduced on build 94**, as the entry state expected. The tester observed the suggestion list drawn from around the **device** rather than the Bite while creating the Ronda Bite, which is the behaviour Run 6 characterised: the candidate list comes from the device's surroundings and is then ranked by distance from the Bite, so for a Ronda Bite it can only offer Bern restaurants over 1500 km away. The restaurant was ultimately found by typing its name, which is the manual compensation the in-app hint asks for. Recorded without an artifact — the observation was made before the capture was taken — and the issue stays open with no fix in this changelog range.
- Saving produced a **green success toast at the top of the screen**, `Bite erfolgreich erstellt!`, which auto-dismissed after roughly five seconds, after which the app returned to the Bites list with no residual alert. This covers the success half of [issue #1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305) only.
- **[Issue #1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310) is verified.** The Firestore baseline before the save was `biteCount: 606`; the profile read **607 immediately afterwards with no app restart**, which is exactly the behaviour the issue said was missing. The created Bite listed as `1539 KM`, `RONDA, SPANIEN`, confirming the position landed on the Google place rather than the device.

### Session 5 - Deletion, #1304, And #1232

- The delete action lives on the **Meine Bites** page as `Bearbeiten` / `Löschen`, not on the Bite detail page. Recorded because Run 6 did not state where it lives.
- **The delete toast was green and reported success**, observed directly by the tester. It is recorded without an artifact: the capture burst's window elapsed before the action was performed and all frames were byte-identical, so the screenshot evidence for this one observation does not exist. The cause was procedural rather than an app behaviour — the burst was started and _then_ the tester was told to act, so the window closed while the instruction was still being read. Future timing-sensitive captures should use an audible cue and a window measured in minutes. With the create and delete toasts both green on success, [issue #1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305)'s success path is covered on two distinct actions; its failure path remains untested.
- Opening the deleted Bite's surviving photo from the local gallery produced a **blocking modal**, `Bite nicht gefunden` / `Dieser Bite ist nicht mehr verfügbar. Er wurde möglicherweise gelöscht.`, with a `Zurück` action and skeleton placeholders behind it rather than a hang. [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232)'s not-found branch remains fixed on build 94.
- **[Issue #1304](https://github.com/muhammedgaygisiz/travellers-apps/issues/1304) is verified.** `Zurück` dismissed the alert, returned to the gallery, and other photos opened normally. The alert neither outlived its page nor left the gallery unresponsive behind it.
- The profile then read **606**, so the counter **decrements live as well as increments**. #1310's fix is bidirectional. This was not something the issue described, and would have shipped unchecked otherwise.

### Run 7 Outcome

- **All seven fixes carried by build 94 are physically verified**: #1303 on three surfaces, #1304, #1305 on the success path, #1306 across three signals, #1308 on pre-fix data, #1309, and #1310 in both directions. #1232 was re-verified on its not-found branch.
- **The Run-6 blocker is resolved and verified.** [#1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308) was the single P0 that made Run 6 a release-candidate fail, and the fix is confirmed on a review written a year before it. Build 94 carries **no inherited P0**.
- **One new finding, minor.** The Bite creation form draws the selected position's marker in **red** while the selected source is `Aus Google`, whose colour is **orange** by the position modal's own legend. The position and the textual label are both correct, so nothing malfunctions; two views of the same fact simply disagree on which source it came from. Recorded rather than filed by decision, and explicitly the same family of defect #1306 addressed.
- **Accepted rather than treated as gaps to close.** By decision at the end of the run: #1305's failure path, since the issue was that toasts never signalled failure and only the success half is proven; #1308's residual fallback, where a review whose `authorId` cannot be resolved still renders the stored legal name; and confirmation that the deleted Bite's Storage object was removed.
- **The evidence gaps carried in from Run 6 are all still open**, none having been addressed by this build: runtime localized permission prompts, a successful `Erneut versuchen`, #1273's login pending state, the refused App Check token, and Analytics DebugView. The App Check one is now doubly blocked, since the flag is off in this artifact.
- **Release-candidate result: pass for the iOS half, incomplete overall.** Nothing found prevents registration, login, Bite creation with a photo, or app start; the only prior blocker is fixed and verified; and the one new finding is cosmetic. The pass is **not** complete: **Android remains unexecuted**, as it has in every run since Run 3, along with menu drafts, follower push tap, production Analytics Realtime, the Business app's authenticated surface, and the Playwright suites. **The web half was executed for the first time in this run**, against a different build, and is recorded separately below — it covered Bucket Lists, the privacy policy, the web deep link and the Business app's build identity, which earlier runs had listed as never executed.
- Worth recording for the next run, because it shaped the evidence rather than the result: three of this run's strongest checks worked only because the fixture made a wrong answer _visible_ — a review whose stored and display names differ, a photo 1800 km from the device, a Firestore count read before the write. Where those coincide, a broken implementation and a working one produce identical screens. Run 6 reached the same conclusion from the opposite direction when a social sign-in account on a second surface was what exposed #1308.

### Run 7 Cleanup Inventory

- The run created exactly one artifact, `Test Run 7 Bite 1` at Toro Tapas Ronda, and **deleted it within the run**. The profile count returned from 607 to 606, and opening it afterwards produced the not-found modal, so the Bite document is gone.
- **The Storage object for that Bite was not confirmed removed.** Accepted by decision; recorded so it is not mistaken for a verified deletion.
- **No disposable account was created.** The whole run used the main account, so unlike Runs 5 and 6 there is no account to delete and no deletion cascade was exercised.
- **Nothing was posted to any third party.** The drafted reply on Kristina's review was cancelled rather than sent, so no live user was notified and no content of ours remains on anyone else's Bite.
- The Run-4 inventory still stands and must not be removed: three anonymised Bites and their two Storage objects.
- **The local gallery now holds this run's deleted-Bite photo**, which restores the fixture Run 6 cleared. A future run needing the #1232 or #1304 not-found path can use it directly instead of manufacturing one.

## Web Execution - Build 95 (Run 7)

### Entry State And Build Identity

- **The web half was executed for the first time in this charter's history.** Runs 3 to 6 recorded it as unexecuted; this section is the first evidence of any kind for it.
- **It tests a different build from the iOS half, and this is structural rather than accidental.** The release cadence puts the stores on build `x` while `develop` and the web deploy move to `x+1`, so once the build 94 release PR merged, CI deployed the web app from `develop`. The deployed app reads `version: "1.0.1", buildNumber: "95"`, read directly out of the bundle's inlined environment object. A single run therefore covers **iOS 94 and web 95**, and neither result transfers to the other.
- The host is correct: `bite-tribe.web.app` is the production domain, not a preview target. It is the `SHARE_BITE_URL` baked into the app, so it is the host real users reach from a shared Bite.
- **The deployed bundle passes the production-cleanliness check.** Its inlined environment object carries no `NX_APP_BITE_TRIBE_IS_DEV` and no `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN`. This is the same check the charter requires before wrapping the native artifacts, run here against what is actually served.
- One difference from a local production build, worth knowing before the App Check flag is ever turned on: the deployed object **omits `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` entirely**, where a local build inlines it as `"false"`. The effective behaviour is identical, since the code compares against `'true'`, but it means CI does not set that variable at all. Setting it locally will not affect the deployed web app.

### Methodology - Which Browser The Web Half Can Be Driven In

- The constraint is narrower than it first appeared, and the first wording of this section overstated it. **Automation is not the problem; the browser is.** The web half was in fact driven end to end by automation in an ordinary Chrome, including every onboarding step below. What failed was an isolated, instrumented preview browser.
- Driving the app with an instrumented browser produced an App Check attestation **403**, which tripped the SDK's `appCheck/initial-throttle` for **24 hours**. Subsequent attempts were throttled, Auth then logged `Error while retrieving App Check token`, and the registration request returned **401**. Registration was impossible.
- **A control test settled the cause.** The identical URL loaded in an ordinary human-driven Chrome produced App Check initialization with **no 403 and no throttle** after more than eight seconds, and the same registration then succeeded. The variable was the browser, not the product.
- The reason is architectural: App Check's web provider is **reCAPTCHA Enterprise**, which scores the client. A throwaway instrumented browser scores badly and is refused; an ordinary Chrome profile scores normally and is not, **even when a tool is driving it**. The practical rule for this charter is therefore: run the web half in a real browser profile, and automate it freely from there.
- Recorded because it nearly produced a false P0. The 403/401 chain reads exactly like broken web registration, and the web half having never been executed made "nobody would have noticed" a plausible story. It was wrong.
- **This is also the first concrete evidence on App Check's web path**, which [[Current State - Known Issues]] lists as an outstanding gap: attestation succeeds for a legitimate client and correctly refuses a suspicious one. It does not close the enforced-mode gap, which still needs a build with the flag on.
- What automation **can** still do, and did do here, is DOM-level inspection of whatever is on screen. That is how the second finding below was reached, and it is not reachable by a tester driving a device by hand.

### Registration And Onboarding

- Registration used a disposable account, `run7web`, on the address Runs 5 and 6 used and Run 6 deleted. Credentials were entered by the tester; navigation and verification were automated.
- The password-strength gate works as specified. All four requirements — lower case, capital, number, minimum eight characters — flipped from `✗` to `✓` as the password was typed, and the `Sign Up` button moved from disabled to enabled only once all four passed.
- Registration succeeded and navigated straight to onboarding. **No toast is shown on successful registration**; the navigation is the feedback.
- Step 1, `Your identity`: the display name field gates `Next`, and a **uniqueness check** ran against the `displayNames` collection, confirming `Display name is available.` in green. Profile photo is correctly optional.
- **Step 2, `Profile visibility`: the run's significant finding, filed as [issue #1326](https://github.com/muhammedgaygisiz/travellers-apps/issues/1326).** `Stay private` is pre-selected and the radio genuinely reports `checked: true`, but `Next` is disabled with no explanation. Clicking the **already-selected** option enables it without changing the radio's checked state, so the pre-selection is cosmetic and the form model only registers an explicit change event. A new user who accepts the default — the privacy-preserving option the UI presents as already chosen — is stuck on step 2 of 7 with a dead button and no error.
- Step 3, `Currency`, is the control that makes #1326 specific rather than systemic: its device-derived default of `Swiss Franc` **is** registered, and `Next` is enabled on arrival.
- Step 4, `Language`, likewise defaulted from the device to `English` with `Next` enabled.
- Step 5, `Location`: `Share my location` / `Not now`, with `Not now` chosen. `Next` is disabled until one is picked, which is legitimate here because nothing is pre-selected. The copy **adapts to the step 2 choice** — `Your profile is private, so your home city stays off public surfaces, just like the rest of your profile` — which is independent confirmation that the private selection propagated. Home city is explicitly optional.
- Step 6, `Notifications`: `Enable notifications` / `Not now`, with `Not now` chosen deliberately rather than granting a browser permission.
- Step 7, `All set`: `You're all set, run7web!`, with the display name correctly interpolated and the progress bar complete. `Finish` landed on the `/home` feed with a `Discover Bites` coach mark.

### What The New User Document Settles

- **#1303's write path is verified without any timing luck.** The freshly created user document reads `appVersion: "1.0.1"` and `appBuildNumber: "95"`, matching the deployed build exactly. The iOS half could only observe this because the once-per-day throttle happened to have aged out; a brand-new document has no throttle state, so this is the unconditional confirmation.
- `displayName` and `normalizedDisplayName` are both `run7web`, and `onboardingCompletedAt` is recorded, so onboarding completion persists server-side.
- `fullName` is empty. A password registration carries no legal name at all, which is consistent with #1308's cause being that Google and Apple sign-ins supply one.
- `emailVerified: false` with `emailVerificationRequired: true`. The verification mail flow was **not** exercised in this run.
- Firebase Authentication shows exactly **one** new user for this run, so an earlier tab mix-up did not create a second account.

### Surfaces Executed After The First Write-Up

The first pass of this section stopped at onboarding and was too quick to call the half finished. The following were then executed, and several had never been reached in any run.

- **The web deep link works, and it is the first execution of that surface.** `/s/bite/<id>` resolved to the Bite page. The page rendered the dish, restaurant, distance from the viewer, tags, map, and reviews.
- **#1308 holds on web as well.** The same Kristina fixture rendered `Kristina` with the stored legal name absent from the page entirely. The read-time override is not iOS-only.
- Currency conversion is visible on that page: `CHF 2.79` alongside the Bite's original `€3.00`, using the preferred currency chosen during onboarding. The relative timestamp rendered as `last yr.` against iOS's `letztes Jahr`, so the localized relative formatting works on both.
- **The Bite creator's name is resolved correctly, and this was checked deliberately** because it is the same denormalization shape #1308 got wrong. `biteCreatorLoader` reads the user document and the template renders `displayName || 'Anonymous'`, gated on the creator's profile being public. It is not the auth legal name. There is no second #1308 here.
- **Coach marks**: a chain of four — `Discover Bites`, `Explore BiteTribe`, `Shape your feed`, `Share a Bite` — each dismissed with `Got it`, after which the feed was interactive. A fifth, `Your bucket lists`, appears on that page.
- **Bucket Lists** reached, rendering an empty state for a new account with a sort control and `Create new bucket list`. First execution.
- **Settings** reached in full: the verify-email banner with `Resend email`, Account Type, Push Notifications correctly reporting `Notifications are not available on this device` in a desktop browser, five preference controls, `Save preferences` correctly disabled with no pending change, `Logout`, and `Delete Account`. First execution.
- **The `PRO` card shows as selected on a brand-new free account.** This matches Run 6's conclusion that it is a deliberate beta grant rather than a defect, now confirmed on web and on an account created minutes earlier.
- **About** reads `Version 1.0.1 (Build 95)`, matching the app menu, so #1303's two display surfaces agree on web exactly as they did on iOS. Its user counter read **116**, one higher than the 115 the iPhone showed earlier in the same run, which is `run7web` registering — small live evidence that the counter is computed rather than cached.
- **The privacy policy** was opened at `/privacy`: roughly 3,000 words of numbered sections, `Last updated: February 2026`. **First execution in any run.** Not a defect, but worth a deliberate review: the policy predates this build's change to how review author names are published.
- **Search** works, including the scope chips `User`, `Bite`, `Restaurant`, `City`, `Country` and a list/map toggle. A `Bite`-scoped query for `Börek` returned seven results across several countries, including the `Bash Burek` Bite in Prizren, with umlaut matching intact. This is consistent with Run 6's characterisation of the query as a global text search ranked afterwards.
- **[Issue #1325](https://github.com/muhammedgaygisiz/travellers-apps/issues/1325) reproduces on web, and the web evidence changed its diagnosis.** On the `Create Bite` form with no photo uploaded, the selected source is `From GPS`; the modal draws that marker **blue**, matching its own legend, while the form behind it draws the same position **red**. Both maps were visible in a single capture. The original iOS report had the label at `Aus Google`, whose legend colour is orange, and the marker likewise red. Two different sources both rendering red means the form is not picking the wrong source colour, it is not picking a source colour at all. The issue was updated with this; its scope is wider than first filed.
- Two incidental observations, neither filed. The navigation button remains stuck reading `Opening Create Bite…` and disabled after navigation completes, which is the #1292 loading state not resetting on the retained page. And the 50 hidden delete alerts from the feed are **still in the DOM after navigating to `/new-bite`**, so #1327's cost persists across navigation rather than only scaling with feed length.
- **Distances render despite the account choosing `Not now` for location.** This is correct rather than a leak: the position reader resolves only on an existing grant and never prompts, and the browser profile already held a geolocation grant for the origin. Onboarding's `Not now` defers the prompt; it does not revoke a grant that already exists.

### Bite Creation On Web

Executed on decision after the surfaces above, accepting the Storage cleanup cost.

- The photo was supplied programmatically to the form's `input[type=file]` rather than through the OS picker, because the picker cannot be driven. The app's handler reads `input.files`, so the same code path runs; what is **not** covered is the picker interaction itself. The image previewed immediately, with crop and delete controls appearing.
- Restaurant selection offered `Johny's Road Kitchen 0.3 km`, `Mega Pizza Kurier 0.5 km`, `Fischerstünbli 0.5 km` and more. **This does not test [issue #1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307)**: that defect needs the device position and the Bite position to differ, and this Bite was positioned `From GPS` in Bern, so the two coincided and a correct and a broken implementation would look identical. Reproducing it on web needs a foreign-positioned Bite.
- **Tags were suggested automatically** from the chosen restaurant — `korean` and `streetfood` for Johny's Road Kitchen.
- **[Issue #1325](https://github.com/muhammedgaygisiz/travellers-apps/issues/1325) was confirmed a third time, which settles its diagnosis.** Selecting the restaurant moved the source to `From restaurant`, whose legend colour is green, and the form drew the marker **red** again. Across this run the form rendered red for `Aus Google` (orange), `From GPS` (blue) and `From restaurant` (green). Three different sources, one colour: the form does not read the source colour at all.
- **[Issue #1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305) is verified on web, with better evidence than the iOS half produced.** The toast was captured as a live object rather than inferred from a screenshot: `ion-toast`, `message: "Bite created successfully!"`, **`color: "success"`**, **`position: "top"`**. The issue was that toasts disagreed on position and never signalled outcome; both are now explicit properties rather than something a reader has to judge by eye.
- **[Issue #1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310) is verified on web.** The profile Bite count went from `0` to **`1`** immediately, with no reload, and the new Bite rendered on the profile with its restaurant and a 0.25 km distance.
- The profile also showed `Private profile — You appear as anonymous and stay off public social surfaces`, so the step 2 visibility choice survived registration, onboarding, a Bite creation and a navigation round trip.

### Why #1305's Failure Path Could Not Be Reached

- This was attempted deliberately, and the negative result is worth more than the test would have been.
- Firebase backends were made unreachable at the transport level, then a bucket list was created. The result was **no toast of any kind** and no list on screen — which looked at first like a silent failure.
- **It was not a failure.** After connectivity was restored the list appeared: `Firestore queued the write and it landed on reconnect`. Nothing was lost, and no toast fired because nothing failed.
- The conclusion is general: **cutting the network cannot exercise #1305's failure toast for a Firestore write at all**, because Firestore queues writes rather than rejecting them. A disconnection produces a deferred success. Reaching the failure path needs an operation that genuinely rejects — a Storage upload or a callable — which is what iOS's #1229 offline-photo work was about. This explains why that half of #1305 has survived seven runs unexercised, and tells the next run to stop trying to reach it by going offline.
- One observation stated with a caveat: the new list was not visible while offline, and was visible after reconnect **plus a reload**. Whether it would have appeared live on reconnect without the reload was not established, because the page was navigated before that could be checked.
- The method was a simulated transport failure rather than a true offline transition, and is recorded as such.

### Remaining Surfaces, Logout And Login, And The Business App

- **Leaderboard** renders correctly: `Mo` of Bern at rank 1 with 606 Bites — matching the main account's count after the iOS test Bite was deleted earlier in the same run — then `Feyza Gaygisiz` 561, and so on. Names shown are display names throughout. `run7web` does not appear, which is what a private profile should do.
- **Market Place** renders `Bern's Top 10 Must Eats` by `@Mo` with a verified badge, a `Best Seller` marker, `Sold 6 times`, 10 Bites, Free, and a `View BiteTrail` action. First execution.
- **Logout** ended the session cleanly and returned to `/start`. **Login** with the same account succeeded and landed on `/home` with the feed and the verify-email banner intact. Neither produces a toast; navigation is the feedback, which matches registration.
- **The Business app was reached for the first time in any run.** `bite-tribe-business.web.app` serves `version: "1.0.1", buildNumber: "95"`, the same build as the consumer web app since both deploy from `develop`. Its inlined environment object is correctly differentiated and clean: `NX_APP_BITE_TRIBE_IS_BUSINESS: "true"`, its own `NX_APP_BITE_TRIBE_BUSINESS_AUTH_DOMAIN`, and **no `IS_DEV` and no App Check debug token**. Execution stopped at the start screen, because going further needs business credentials and a separate account.

### My Bites And The Bitemap

- **My Bites** renders the account's Bite with its restaurant, distance, rating and `Edit`/`Delete` actions. Its controls are `Filter`, `Bitemap`, a `Distance` sort chip, and a searchbar revealed by a header icon.
- **This page corroborates #1329's diagnosis.** Its sort chip reads `Distance`, correctly translated, because `'distance'` **is** a valid option here. The reducer's `myBites: 'distance'` default is right; only the `bucketlists: 'distance'` copy of it is wrong, which is what puts that select into the placeholder path.
- The searchbar filters client-side in both directions: a non-matching term empties the list, and a matching term restores the card.
- **Two findings came out of this page**, both filed and both `P3`:
  - [Issue #1330](https://github.com/muhammedgaygisiz/travellers-apps/issues/1330): the searchbar spans the full viewport on desktop. Measured at 1470px wide: searchbar **1408px**, Bite card 459px, with `max-width: none`. It is roughly three times the width of a card and ignores the measure every other element respects. Invisible at phone widths, conspicuous on desktop.
  - [Issue #1331](https://github.com/muhammedgaygisiz/travellers-apps/issues/1331): a search matching nothing shows the empty-**feed** copy, `No bites found. Be the first one.`, telling a user who has Bites that none exist and inviting them to create one, when the correct action is to change the search term.
- **The Bitemap works on both surfaces, and this is its first execution on web.** The My Bites map view rendered the account's single Bite as a marker carrying its rating inline (`4 ★`). The home map view rendered the full data set with **`leaflet.markercluster` working**: numbered, colour-graded cluster badges (62, 27, 18, 15, 14 and smaller) resolving to individual rating markers, plus zoom and geolocation controls.
- Recorded because the charter has a standing note about markers: they paint correctly in an ordinary Chrome. The known blank-marker behaviour belongs to the Loki container environment, not to the app.

### Bite Deletion And Account Deletion

- **Deleting the Bite captured the toast the iOS half missed.** The confirmation alert reads `Delete Bite` / `Are you sure you want to delete this bite?`, and the result was `ion-toast`, `message: "Bite deleted successfully!"`, **`color: "success"`**, **`position: "top"`**. Run 5's burst-capture failure left the iOS delete toast recorded on the tester's word alone; this is the structured evidence. [Issue #1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305)'s success path is now verified on two distinct actions, on web, with attributes rather than inference.
- **[Issue #1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310) decrements on web too**: the profile went from `1` to **`0`** with no reload, matching the iOS behaviour. The fix is bidirectional on both platforms.
- Incidentally this validated [issue #1331](https://github.com/muhammedgaygisiz/travellers-apps/issues/1331)'s framing rather than contradicting it: after the delete, `No bites found. Be the first one.` is **correct**, because the account genuinely had no Bites. The copy is only wrong when a filter caused the emptiness.
- **Account deletion is a three-step flow, and this is the first time any run has documented it.**
  1. A full-page screen naming the account and its sign-in method, stating `Deleting your account cannot be undone.` in red, then splitting the consequences into `What is deleted` and `What stays`.
  2. A modal confirmation, `Delete account?`, which **restates the exact account** — `run7web · muhammed.gaygisiz@bitetribe.app` — so the wrong account cannot be confirmed from muscle memory.
  3. **A re-authentication prompt**, `Confirm it's you` / `For your security, enter your password to continue.`
- **The re-authentication step answers a question no previous run recorded.** Firebase generally requires a recent login before deletion, and whether the app surfaces that had never been observed. It does.
- **The deletion screen is worth recording as a positive.** The `What stays` items give reasons rather than just facts — `Your Bites stay on BiteTribe without your name, so other people's bucket lists and BiteTrails keep working`, and purchase records staying `so sellers keep their sales figures`. It also admits a limit most products omit: `Anonymous usage and crash statistics that were already collected cannot be removed retroactively.` This is the anonymisation behaviour that Run 6 had to discover by observation, disclosed here at the point of decision. There are no dark patterns: the destructive action is red and plainly labelled, and `Cancel` is a real adjacent option at both steps.
- **The outcome toast was not observed, and this is a limitation of the method rather than a finding.** Completing the deletion triggers a **full page reload**, which destroyed the mutation observer along with the document. Nothing is claimed about whether a success toast fired. The reload is itself reasonable for account deletion, since it guarantees no in-memory state survives.
- **The session is genuinely gone, not merely navigated away from.** The app landed on `/start`, and a subsequent direct navigation to `/home` bounced back to `/start`, so the auth guard holds after deletion.
- **The display-name reservation is released on deletion**, checked deliberately because nothing in the deletion screen or any prior run mentions the `displayNames` collection. After deletion the collection has no `run7web` document: sorted by id, the slot between `rumeysa gaygisiz` and `sam` is empty. This is the good outcome and worth stating as a verified property rather than an assumption — had it not been released, every deleted account would permanently lock its own display name, so a user could never re-register under their own name, with nothing in the UI explaining why it was taken.

### Third Finding - The Local Gallery Is Not Scoped To The Account

- Filed as [issue #1328](https://github.com/muhammedgaygisiz/travellers-apps/issues/1328), `bug` plus `security`, and **the run's most consequential finding**.
- `run7web` had uploaded exactly one image. Its `Gallery` listed **thirteen**. The other twelve belong to the account that used this browser profile before `run7web` existed.
- The cause is in the source, not inferred from the screen: `GalleryService.loadImages()` reads `Filesystem.readdir({ path: '', directory: Directory.Documents })` with **no user scoping** — no uid in the path, no owner filter, and nothing clearing the directory on logout. On web, Capacitor's Filesystem is IndexedDB keyed to the origin, so every account signing in through that browser profile reads the same directory.
- The exposure is not only the photographs. `biteIdFromImageName` derives a Bite id from the filename, so the gallery also reveals **which Bites the previous user created**, and links to them.
- **Confirmed across a full logout and login cycle**, which was the open question when it was first filed: signing out and back in leaves all thirteen in place. Logging out does not clear it.
- On native this is defensible — a phone generally has one owner. On the **web** app a shared or public computer is an ordinary scenario, and that is where it matters. `Delete all` exists but is manual and depends on the departing user knowing to use it.
- **Resolved by scoping the directory to the uid rather than by clearing it on logout.** Local copies now live under `Documents/<uid>/`, and `localImageDirectory` is the only way any reader or writer reaches them. Scoping the read holds where a logout hook does not: this run confirmed the files survive a logout, and a browser tab that is simply closed never runs one at all. Copies written before the change are adopted by the signed-in user on a device and **deleted in a browser**, which also removes the twelve photographs this run found still sitting in that Chrome profile. The web behaviour was verified against the real Capacitor filesystem in a browser: a second uid reads an empty directory. See the account-scoping contract in [[UC - Use Local Gallery Support]].

### Fourth Finding - A Raw Translation Key On The Bucket List Sort Chip

- Filed as [issue #1329](https://github.com/muhammedgaygisiz/travellers-apps/issues/1329). Noticed on screen by the tester as a lowercase `name` where a translated label belongs, then traced to **two stacked causes**.
- **The default sorting value is not a valid option for that control.** `filtering-and-sorting/reducer.ts` initialises `bucketlists: 'distance'`, while the bucket list select offers only `name` and `createdAt`. Confirmed live: the select reports `value: "distance"` against options `Name`/`Date`. With no matching option, Ionic renders the **placeholder** instead. The selector's `|| 'name'` fallback never fires, because `'distance'` is truthy.
- **The placeholder can cache a raw key.** `sortingLabel` calls `transloco.translate()` imperatively inside a `computed()` whose only dependency is `sorting()`. If it first evaluates before translations load, Transloco returns the key and the computed caches it, never recomputing when translations arrive. That explains the intermittency — the same page rendered `Name` on one visit and `name` on another.
- The keys are fine: `en.json` has `name: "Name"` and `date: "Date"`, which is why the option labels render correctly while the placeholder does not.
- **Resolved by decision as a removal rather than a fix.** The sort chip should not exist on this page: drop it and its store slice, add a client-side name filter in the style of `My Bites`, and sort implicitly and alphabetically by list name, because creation date is not a useful ordering for bucket lists. Recorded on the issue. Note for whoever implements it: `My Bites` gets its searchbar for free by reusing the **home** component, and that reuse is not available here, since home is Bite-shaped and bucket lists are not.
- **Implemented as decided, and the removal reached further than the chip.** The chip, `sortingLabel`, the `sorting` input and the `sortingChange` output are gone from `BucketlistsPage`, and with nothing left reading it, so are the `bucketlists` entry in the filtering-and-sorting slice, its selector, its action, its reducer case, the store and data-access methods behind them, and the bucket list `sortByCriteria` and `sortBucketlistsByCreatedAt` utilities. `sortedBucketlists` now calls `sortBucketlistsByName` unconditionally. **Both stacked causes are deleted rather than patched**: there is no invalid default because there is no default, and no `translate()` inside a `computed()` because there is no placeholder to compute. The page gained its own header search toggle and `ion-searchbar` — the same fuzzy `normalize` plus `getSimilarityScore` match `My Bites` uses, over the list name only — and an empty state that keeps #1331's distinction: one container branching on the search term, so a filter that matches nothing says so and offers `Clear search`, while a genuinely empty page invites a first list. Three new keys — `search-bucket-lists`, `no-bucket-lists-match-search` and `no-bucket-lists-yet-create-one` — in all eleven locales. The page had **no empty state at all** before this; an account with no lists saw a bare page under the title. `sortBucketlistsByName` also stopped sorting its argument in place, which had been mutating the entity adapter's memoized array. **The page header went back into normal flow with the chip.** It had been `slot="fixed"` over an opaque 68px band whose bottom border drew the separator line under the title; the band existed to mask list items scrolling under the controls, so with only a title left there was nothing to hold in view and nothing to mask, and the line marked a boundary that no longer existed.

### Second Finding - Eager Delete Alerts

- Filed as [issue #1327](https://github.com/muhammedgaygisiz/travellers-apps/issues/1327). The `/home` feed instantiates **50 `ion-alert` elements**, every one headed `Delete Bite`, against 51 `ion-card` elements, all carrying `overlay-hidden`, out of 2305 DOM nodes.
- The account owns **zero Bites**, so every one of those dialogs is a delete confirmation for a Bite the user cannot delete. There is no ownership gating and no deferral until the action is invoked, and the cost scales with feed length.
- Nothing is user-visible and nothing breaks, so this is hygiene and performance rather than a functional defect.

### Web Outcome

- **Result: fail, on two P0 findings, with six findings in total.** [#1326](https://github.com/muhammedgaygisiz/travellers-apps/issues/1326) and [#1327](https://github.com/muhammedgaygisiz/travellers-apps/issues/1327) were **accepted as release blockers by decision** after the run. [#1328](https://github.com/muhammedgaygisiz/travellers-apps/issues/1328) is `P1`, [#1329](https://github.com/muhammedgaygisiz/travellers-apps/issues/1329) is `P2`, and [#1330](https://github.com/muhammedgaygisiz/travellers-apps/issues/1330) and [#1331](https://github.com/muhammedgaygisiz/travellers-apps/issues/1331) are `P3`. Build 95's web deploy is therefore not a release candidate.
- **The first execution of a half skipped for seven runs produced six defects, two of them blockers.** That is the argument for executing it regularly, stated as a result rather than an opinion.
- Worth noting how they were found, because it argues for keeping both methods. #1327 and #1328 came from **DOM and source inspection** and are invisible to a tester driving a screen. #1326 came from taking the **default path** a human avoids by instinct. #1329, #1330 and #1331 came from the **tester simply looking at the screen** and asking why something seemed off. Neither method would have found the other's findings.
- Recorded because the classification was a decision rather than a test result, which is the same shape as #1308 in Run 6: neither finding stops the app from running. #1326 blocks a user who takes the default path through first-run onboarding, and #1327 breaks nothing at all — it is DOM and memory cost that scales with the feed. Both were raised by this run as findings and elevated deliberately.
- Everything else executed — build identity, bundle cleanliness, App Check attestation, registration, the password gate, all seven onboarding steps, and the resulting user document — worked.
- **Not executed on web**, and still outstanding: anything behind a Business app login. The Playwright suites were not run either. Everything else in the consumer web app was reached.
- **The most valuable thing this half produced is not a fix verification.** Both findings, #1326 and #1327, are defects that seven runs of iOS-only execution could never have surfaced: one lives on a code path a human tester avoids by instinct, the other is invisible without DOM inspection. Both were then classified P0. That is the argument for executing this half regularly, notwithstanding the automation constraint above — the first execution of a half that had been skipped for seven runs immediately produced two blockers.

### Web Cleanup Inventory

- **The `run7web` account was deleted at the end of the run**, by the tester, through the app's own deletion flow. That discharged the cleanup and executed the account-deletion surface in the same action.
- **It created one Bite, `Run 7 Web Test Bite` at Johny's Road Kitchen, with an uploaded image.** The image is a generated placeholder reading `RUN 7 WEB TEST / build 1.0.1 (95) — delete me`, so the object is self-identifying in Storage. The Bite was created deliberately and the Storage cleanup was accepted in advance by the tester.
- **The Bite `Run 7 Web Test Bite` was deleted before the account**, by the tester, and the profile count confirmed it at `0`.
- **The bucket list `Run7 Failure Path Test`**, left behind by the offline write test, goes with the account: the deletion screen lists `Your bucket lists and BiteTrail ratings` under what is deleted.
- **The Storage object is gone too, so this run leaves nothing behind at all.** Verified directly: `images/bites/9afeaf5e-439b-42ad-862e-278eb6873620/` is empty.
- Getting there is worth recording, because the Bite id had died with its document. It was recovered from the **local gallery**, using the very behaviour [issue #1328](https://github.com/muhammedgaygisiz/travellers-apps/issues/1328) reports: the gallery survives logout and account deletion, and its filenames follow `bites_<docId>.<ext>`, so the surviving `bites_9afeaf5e-….jpg` still named the deleted Bite. The file was confirmed as ours by its dimensions — 800x600, the exact canvas size the placeholder was generated at.
- Two controls make the empty folder a real result rather than a wrong path. The upload convention is `images/bites/{biteId}/{filename}`, pinned by `BITE_IMAGE_PATH_REGEX` in `set-bite-image-path-on-upload.ts`; and a **live** Bite's folder — the Börek fixture — does contain its image, at 464.77 KB.
- **This looks like a contradiction of Run 5 and probably is not.** Run 5 recorded that Bite images are kept and only the profile picture is removed. That observation came from an **account** deletion, where Bites are anonymised rather than removed, so their images must stay. This run deleted the **Bite explicitly first**, which is a different operation, and its image went with it. The charter had been carrying Run 5's observation as a blanket rule about Storage; it is better read as specific to the account-deletion cascade. Stated as the likely reading rather than proven — it cannot be verified now that the Bite document is gone, and a future run wanting certainty should check the Storage folder immediately after an explicit Bite deletion, before deleting the account.
- No reviews were written and nothing was posted to any other user.
- The account is deliberately **not** standing inventory. Keeping it for future runs was considered and rejected in favour of deleting it, so a later run should expect to create its own.

## iOS Execution - Build 93 (Run 6)

### Entry State

- **Methodology change, recorded because it applies to every observation below.** The tester mirrors the iPhone to the Mac as in runs 3 to 5, but this run reads the device screen directly: the iPhone Mirroring window is captured by window id with `screencapture -l`, so each observation has its own artifact instead of being transcribed. The tester drives the device and the screen is read from the capture. Two practical constraints were settled during setup: the window must sit on the MacBook's built-in display, because an external non-retina display halves the capture to 290x647 pixels and small copy becomes unreadable, and device input cannot be injected, so every interaction is still performed by the tester.
- TestFlight showed `BiteTribe 1.0.1 (93)`, developer Muhammed, expiring in 90 days, with an `Open` action confirming build 93 is the installed build rather than an available update.
- The TestFlight `What to Test` copy reads: `Search Bites by country, with faster paged results. See how far a Bite is from you. Reply to reviews. Set your home base during onboarding. Localized emails and timestamps, plus smoother loading throughout.` It matches the build-93 changelog.
- Build 93 was installed **over** build 92, with no fresh install, so the app container survived again. Three consequences: the Run-4 local gallery still holds the deleted-Bite photos that give [issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) its fixture, the existing app-level permissions survive so permission prompts appear only where a grant is deliberately revoked, and first-run install behavior is out of scope exactly as in runs 4 and 5.
- **Build provenance is known before execution for the first time in this charter's history.** Build 93 is source commit `a2753b18`, tag `build-1.0.1-93`, changelog range `ac217b99..a2753b18`, recorded in release PR [#1301](https://github.com/muhammedgaygisiz/travellers-apps/pull/1301). Runs 3, 4 and 5 all had to reconstruct the artifact's commit afterwards, run 5 from a local reflog on one workstation. `738901be` (#1259) automated and documented the native release process between the two builds, which is what removed the reconstruction step.
- Consequently the gap Run 5 could not close is now reachable: `738901be` also adds the localized iOS `InfoPlist.strings` for eleven languages, and it is inside this build's changelog range rather than after it, so **localized system permission prompts are verifiable on this artifact**. Build 92 shipped `Base.lproj` only and could show English prompts alone.
- Run 5 ended as a release-candidate fail with two open P0 findings, and both are the priority of this run:
  - [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232), the deleted-Bite `Open Bite` hang, reproduced on build 92 after being closed with no fix commit. It is now closed against a real fix, #1275, whose diagnosis was that `ResourceRef.value()` threw during the container's input binding so `[biteNotFound]` was never applied. Four separate things need physical evidence: the blocking not-found modal on the surviving fixture, the try-again path, the idle-resource behavior when no `biteId` is carried, and the agreed Crashlytics non-fatal on a settled failure.
  - [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) is still open. Run 5 corrected its framing: the two build-92 dSYM UUIDs marked `Missing (optional)` were the same pair listed for builds 89, 90 and 91, so they are unchanged vendor framework binaries, not the app binary, and the app's own dSYMs sat `Uploaded` at version `Unknown` because nothing had ever thrown inside app code. The #1275 non-fatal is the first deliberate app-code exception in this charter, so it is the artifact that can finally settle the question.
- Build 93 carries a fix for every one of the fourteen issues Run 5 filed, [#1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) to [#1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273), plus eight features and the paged search list. Closure state on GitHub does not replace physical verification, which is the rule that caught #1232 in Run 5.
- The Run-5 disposable account `muhammed.gaygisiz@bitetribe.app`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`, display name `run5mo`, was deliberately kept alive so this run starts from a real onboarded account. It must be deleted at the end of this run, which also executes the account-deletion contract deferred from Run 5.
- The Run-4 cleanup inventory still stands and must not be removed: three anonymous Bites and their two Storage objects.
- The repository branch `1302-chore-test-run-6` was clean when execution began.
- Result: executed. Release-candidate pass with one recommended blocker. See the Run 6 Outcome section below.

### Session 1 - Build Identity, Device Identity, And Authenticated Cold Start

- TestFlight confirmed `1.0.1`, `Build 93`, expiring in 90 days, with the `What to Test` copy recorded in the entry state above.
- The installed-over-92 state was confirmed by the tester, preserving the #1232 fixture and the existing permission grants.
- **The device OS changed between runs.** Settings, General, About showed `Mo's iPhone`, iPhone 12 mini, model `MGDX3ZD/A`, running **iOS 26.6**. Runs 3, 4 and 5 all ran on iOS 26.5.2 on this same hardware. Any behavioral difference from Run 5 therefore has two candidate causes rather than one, and this is noted on each finding where it could matter.
- The OS change sharpens one verification rather than weakening it: [issue #1263](https://github.com/muhammedgaygisiz/travellers-apps/issues/1263) was the push-device row reporting `iOS 18.7` from the frozen WKWebView user agent, and #1278 moved that read to the `@capacitor/device` plugin. The row must now read `iOS 26.6`, a value the old code could not produce under any circumstances, which makes the fix unusually cheap to falsify.
- A cold launch from the home screen, after a full force quit, restored the authenticated session and opened the German Home feed. The feed settled with real content and a resolved `2543 KM` distance to a Bite in `GIRESUN MERKEZ, TÜRKEI`, so no endless loader and no stale location error appeared.
- The signed-in account is the retained Run-5 disposable account `run5mo`, as the entry state planned, so this run starts from a real onboarded account instead of repeating registration and the seven-step assistant.
- [Issue #1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) is physically verified as fixed. The app menu names the account without a trip to the profile: the avatar replaces the profile entry's icon and `run5mo` is its subtitle, which is the implementation #1293 describes, and it costs the menu no additional height.
- Result: pass for build identity, device identity, authenticated session restoration, and the account-identity fix, with one new finding filed below.

#### Session 1 finding - the app reports version 0.0.0

- The menu's own version row reads `Version 0.0.0 (Build 93)` on a device whose TestFlight entry reads `1.0.1 (93)`. The build number is right and the marketing version is a placeholder. Filed as [issue #1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303).
- Traced during the run rather than left as an observation. `readAppMetadata` in `tools/env-var-plugin.js` reads `version` from the root `package.json`, which is `0.0.0` because Nx never bumps it, while `readBuildNumber` in the same function reads the real native build number. That split is exactly why one half of the string is correct. The real `1.0.1` lives only in the Android `versionName` and the iOS `MARKETING_VERSION`.
- **Why five runs missed it.** The version row is not new; it dates from #864. No previous run had a reason to open the app menu at all. #1293 gave the menu a reason to be opened, and the first thing it showed was an unrelated defect that had been visible there the whole time. This is an argument for the charter covering low-traffic surfaces deliberately rather than only on the way to something else.
- The value is not confined to the menu. The About page renders the same string, and `profile-api.service.ts` sends it to `updateUserMetadata`, which writes it to the user document as `appVersion`. **Every user document in production therefore stores `appVersion: "0.0.0"`**, leaving `appBuildNumber` as the only field that distinguishes releases, so release-adoption questions are currently being answered from data that cannot answer them. Same class as #1263: a value displayed and persisted as fact, derived from a source that does not know the fact.
- Decision recorded on the issue during the run: `package.json` becomes the single source of truth and the release tooling propagates it into the native projects, because releases will bump the version there and the build number is expected to lose significance. The opposite direction was rejected as leaving `package.json` permanently wrong. `readNativeVersion` in the release script already reads both native versions and throws unless they agree, so inverting it turns an existing precondition into a post-condition, and `tools/env-var-plugin.js` needs no change because it already reads `package.json`.
- Not release-blocking; nothing malfunctions. Recorded against the release tooling and the stored metadata rather than the app's behavior.

### Session 2 - Deleted-Bite Gallery Fixture

This session was deliberately taken second, ahead of settings and persistence. The #1275 fix files a Crashlytics non-fatal on every settled failure, and that non-fatal is also the artifact [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) needs, being the first deliberate app-code exception in this charter. Run 5 showed non-fatals surface slowly, appearing only after further app starts, so triggering it early buys the rest of the run as ingestion time.

- The Run-4 local gallery survived the update install as the entry state predicted, so the fixture was available directly with no need to manufacture one.
- Opening a photo whose Bite was deleted during Run-4 cleanup gave the viewer `5 / 10` and a `Bite öffnen` action, the same control that hung on builds 90, 91 and 92.
- **Result: pass. [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) is physically verified as fixed on build 93**, the third run to test this path and the first to pass it. The blocking alert appeared immediately: `Bite nicht gefunden` / `Dieser Bite ist nicht mehr verfügbar. Er wurde möglicherweise gelöscht.` with `Zurück`, in German, with no technical text and no raw translation key. Evidence attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232#issuecomment-5243405906).
- The alert offering only `Zurück` was checked against the code rather than assumed to be a missing control: `reportBiteNotFound` in `details.page.ts` deliberately offers only the way back for a deleted Bite, because there is nothing to retry, while `try-again` belongs to the `unavailable` branch of `classifyBiteLoadFailure`. **That branch is therefore still unverified**, and this run reaches it through a failed read under Airplane Mode instead of assuming it works because this one does.
- Finding, filed rather than blocking: [issue #1304](https://github.com/muhammedgaygisiz/travellers-apps/issues/1304). Pressing `Zurück` navigates back to `Galerie` correctly, but the alert survives the navigation and sits over the gallery, and its `backdropDismiss: false` backdrop swallows every tap on the page underneath, so the destination is fully blocked until `Zurück` is pressed a second time. Reproduced twice, deterministically. The second press dismisses it and does not navigate further.
- The mechanism could not be separated on the device and both candidates are recorded rather than one asserted, because they are behaviorally identical: a leaked overlay, since `goBack` calls `navController.back()`, the route change destroys the page, the alert lives on the `ion-app` root and `details.page.ts` has no `ngOnDestroy` and never calls `dismiss()`; or two stacked alerts, since the effect resets `reportedFailure` whenever the failure signal goes falsy, which is what happens while the page tears down. The fix is the same either way, so the ambiguity does not block it.
- Worth recording as a pattern: this is the second finding in two sessions that exists only because a fix made a surface reachable. #1293 exposed #1303, and #1275 exposed #1304. Verifying a fix is reliably where the next defect is found.

#### Session 2 - Run 5's open question on non-Bite photos, closed

- Run 5 left an open question on #1232: the local gallery holds profile photos as well as Bite photos, so `Bite öffnen` might be offered for an image that never had a Bite, which is a different failure class from a deleted one.
- Physically answered: opening the account's profile photo in the viewer offers **no `Bite öffnen` action at all**, only the close control. The concern was unfounded.
- Confirmed in the code rather than left as an observation. `biteIdFromImageName` in the gallery integration parses the id out of the `bites_` filename prefix, and `gallery.service.ts` therefore leaves `biteId` undefined for any other file, which is what withholds the action. The existing unit tests already cover a non-Bite file name.
- Recorded as a robustness note rather than a defect, because it costs nothing to know later: the gate is the file name, so the action is only ever as correct as the naming convention. A Bite photo stored under a different name would silently lose its action, and a non-Bite file named `bites_*` would be offered one.

#### Session 2 - Gallery viewer and gesture contract

- Deferred entirely by Run 5 and executed here, since it is the other half of what #1232 originally shipped.
- Pinch to zoom in and back out worked, and swiping between photos worked with the `n / 10` counter tracking the position.
- Result: pass for the local gallery viewer and its gesture contract on build 93.

### Session 3 - Settings, Persistence, And Notification Rows

- The per-device row under `Push-Benachrichtigungen` reads `iPhone` / `iOS 26.6 · 1.0.1 (93)` / `Dieses Gerät`. **[Issue #1263](https://github.com/muhammedgaygisiz/travellers-apps/issues/1263) is physically verified as fixed**: the real OS version is reported where builds up to 92 reported a frozen `iOS 18.7` from the WKWebView user agent. The iOS 26.6 upgrade recorded in Session 1 strengthens this check, because the old code could not have produced `26.6` under any circumstances.
- Run-5 choices persisted: `Theme` `Dunkel` and `Bevorzugte Währung` `British Pound Sterling`, with `E-Mail-Updates` off.
- **Correction to Run 5, recorded deliberately.** `Kontotyp` shows `Kostenlos` and `PRO` with PRO active on this free account, exactly as Run 5 observed. Run 5 treated that as physical confirmation of [issue #1127](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127) and argued on the issue that the severity was higher than assumed because the wrong tier is rendered to the user on two surfaces. **That reading was wrong.** Every registered beta tester is deliberately granted PRO as a reward for testing, and the grant will be removed before launch, so the displayed tier is correct behavior today rather than a defect being shown to users. #1127 remains a real backend issue about the default tier at launch; it is not something build 93 fails, and future runs should stop recording the PRO card as a confirmed defect.
- This is also a methodology note: five runs have now inspected this card, and the reading that made it into the charter was an inference about intent rather than an observation. Where a screen looks wrong but could be deliberate, the charter should ask rather than conclude.

#### Session 3 - Settings language and save semantics

- Deferred by Run 5 and executed here. Selecting `English` in the `Sprache` row changed the row's own value and nothing else: `Allgemein`, `Bevorzugte Währung`, `Konto` and `Abmelden` all stayed German, and `Einstellungen speichern` woke from inert grey to active blue. The language is therefore not applied until saved, which is what a save button has to mean to be honest.
- This is the correct contrast with onboarding, where Run 5 recorded the language step switching the whole step immediately. That step promises an immediate change and delivers one; Settings promises a saved change and defers it. The two are consistent with their own copy rather than with each other, which is right.
- Saving applied the language across the app and produced a success toast.
- Result: pass for settings language and save semantics on build 93.
- Observation, not a finding, agreed with the tester: saving navigates out of Settings back to Home. The user therefore cannot confirm the saved state in place, or make a second change, without navigating back in.

#### Session 3 - Toast consistency, raised by the tester

- Raised from using the app over time rather than from the matrix: the settings save toast is grey and appears at the bottom, while Bite creation produces a green toast at the top. Filed as [issue #1305](https://github.com/muhammedgaygisiz/travellers-apps/issues/1305).
- The codebase was surveyed during the run rather than filing the two observed cases. There are 14 toast call sites. Exactly two present at the top with `color: 'success'`, and both are Bite paths. The other twelve present at the bottom with no colour at all.
- The survey found something neither observation was looking for, and it is the reason the issue is worth more than aligning a position value: **no toast anywhere passes `color: 'danger'`**. A failed registration, a failed settings save and a failed bucket-list operation render in the same grey, the same position and the same duration as a success, so outside the two Bite paths the outcome of an action is not encoded visually at all and has to be read out of the message text.
- `TOAST_DURATION_MS = 5000` is also declared separately in three services while the two Bite sites hardcode `3000`.
- Not blocking. Recorded as a cross-cutting UI contract rather than against any one screen.

#### Session 3 - Localized iOS permission prompts, verified from the artifact

Run 5 could not test this because `738901be` postdated build 92's archive. It is inside build 93, so this run tried to close the gap and closed most of it, by a different route than planned.

- **The on-device test was considered and deliberately skipped, and the reason matters more than the skip.** `en.lproj/InfoPlist.strings` is byte-identical to the `Info.plist` fallback strings, so on an English-language device the prompt renders the same text whether the localization chain works or is entirely absent. The device is English-first in Preferred Languages, so an on-device check here would have proved nothing. Proving it would have required switching the iPhone's system language to German, and the tester chose not to spend that.
- **Verified from the artifact instead, which is where the previous failure actually lived.** The build-93 archive is on the release workstation, `App 10.08.26, 18.02.xcarchive`, `CFBundleShortVersionString 1.0.1`, `CFBundleVersion 93`, created 10 August at 18:02. Its `App.app` contains all twelve `.lproj` directories, `am`, `ar`, `de`, `en`, `es`, `fr`, `id`, `it`, `pt`, `th`, `tr` and `Base`, where build 92 contained `Base.lproj` alone. `de.lproj/InfoPlist.strings` decompiles to the real German copy, `BiteTribe verwendet deinen Standort, um zu markieren, wo dir ein Essen geschmeckt hat, und um Bites in deiner Nähe zu entdecken.`
- Result: **pass for packaging**, which is the half that was broken on build 92. Unverified: whether iOS selects the right `.lproj` at runtime. That is standard OS behavior rather than app code, so it is recorded as a residual gap rather than a risk.
- Recommendation for future runs, since this will otherwise recur every time: either keep one test device in a non-English system language, or assert the `.lproj` directories in the built `App.app` as part of the release script, so the packaging half never needs a device at all.
- Independent benefit: the archive also confirms build provenance directly from the artifact, ten minutes before the release commit `1358c5cf` and matching the source commit `a2753b18` recorded in [PR #1301](https://github.com/muhammedgaygisiz/travellers-apps/pull/1301). Runs 3 to 5 had to reconstruct this from a reflog.

#### Session 3 - Version disagreement across two screens

- The same build reports two different marketing versions for itself: `1.0.1 (93)` in the Settings device row and `Version 0.0.0 (Build 93)` in the app menu. Settings is correct because `readAppVersion` in `push-installation.ts` calls `App.getInfo()` and reads the native bundle, while the menu and About page read the build-time `process.env['version']` that `tools/env-var-plugin.js` inlined from `package.json`.
- Recorded on [issue #1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303) as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303#issuecomment-5243485369), with the consequence for the fix: the correct value is already available at runtime through a plugin the app already depends on and already calls for this exact purpose, which gives the fix a second option that is independent of whether the release-time propagation step ever runs correctly.

### Session 4 - Bite Creation, Photo Position, And The Position Source Modal

- **[Issue #1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273)'s sibling verified**: tapping `Bite erstellen` produced an immediate loading state, so the create action acknowledges the press. This is the #1292 change.
- The create form opened with the currency prefilled to `Schweizer Franken` from the Bern position.
- **[Issue #1261](https://github.com/muhammedgaygisiz/travellers-apps/issues/1261) is physically verified as fixed.** Choosing a photo from the library showed a loading spinner in the gap between confirming the photo and the preview rendering, where build 92 showed an empty avatar area that made the photo appear to vanish before it appeared.
- The `Posting later` edge case was exercised again deliberately, with a photo taken in Ronda, Spain while the device was in Bern. All three consequences followed correctly: the `Standort` source became `Aus Bild`, the map moved to Ronda with Spanish street names visible, and the price currency changed from `Schweizer Franken` to `Euro`. The EXIF position to currency chain therefore still holds on build 93.
- **[Issue #1266](https://github.com/muhammedgaygisiz/travellers-apps/issues/1266) is physically verified as fixed, and the fix is better than the issue asked for.** The four permanent source buttons are replaced by a source text row with a single edit control. The modal behind it, `Standort ändern`, colour-codes each source to its map marker colour and disables unavailable sources while stating why: `Aus Restaurant` reads `Kein Restaurant gewählt` and `Aus Google` reads `Kein Google-Ort gewählt`, rather than the option being silently absent.
- Finding, filed rather than blocking: [issue #1306](https://github.com/muhammedgaygisiz/travellers-apps/issues/1306). The modal's map neither follows the selection nor marks it. With `Aus Bild` selected the modal opened on a street-level view of Bern showing the blue GPS marker, while the selected position was 1500 km away in Ronda. Selecting from the list moved the checkmark correctly every time and the map never moved at all, so the user confirms with `OK` a position the map has never shown.
- Two causes were separated in the code during the run. `zoomToGpsOrDefault` fits the candidate markers only when there is no GPS position, and calls `zoomToGeopoint(gpsPosition)` whenever there is one, which in this modal is always; and `selectDraftSource` sets the draft source and nothing else, while the map initialises once and `hasAutoFitted` blocks any later fit.
- The tester added the second half of the issue from experience rather than from the matrix: the selected marker needs to be visually distinguished, because candidates can sit metres apart when a restaurant, a Google place and a manual pin are all near each other, and colour alone is unreadable at that scale. `focusMarker` already implements exactly this, rendering the focused marker at `size: 'big'` while deliberately preserving its colour so that size alone marks focus, and #1288 already touched that file. It is wired to marker clicks but not to list selection, so the same choice made two ways leaves the map in two different states.
- **Worth recording as a testing insight, not just a defect.** This bug is invisible when `Aus GPS` is selected, because the map is then accidentally correct, and it only appears when the position is somewhere other than the device. It was reachable at all because the run reused Run 5's foreign-photo case. A local-photo run would have passed this screen.
- The inline map on the create page itself follows the position correctly throughout, moving to Ronda on the photo and staying there after the restaurant was chosen, so #1306 is specific to the modal.

#### Session 4 - Restaurant selection, and what the dual distance exposed

- **[Issue #1267](https://github.com/muhammedgaygisiz/travellers-apps/issues/1267) is verified fixed**: the modal header renders `Abbrechen` and `Restaurant auswählen` cleanly, where build 92 collided them into `AbbrecheRestaurant auswähl...`.
- **[Issue #1269](https://github.com/muhammedgaygisiz/travellers-apps/issues/1269) is verified fixed**: every result carries both distances, `1532.3 km vom Bite` and `11.0 km von dir`, and the list is ordered by distance from the Bite. The threshold for showing both is deliberate, `DIVERGED_POSITION_THRESHOLD_KM` at 0.5 km, so a Bite posted where the user is standing does not get a redundant second line.
- **[Issue #1268](https://github.com/muhammedgaygisiz/travellers-apps/issues/1268) is verified fixed**: the custom option now reads `Verwende: "Toro Tapas"` in the du-imperative, where Run 5 recorded the infinitive `Verwenden:`.
- **[Issue #1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) re-verified**: Google Places responded normally under App Check enforcement, for a third consecutive run.
- Finding, filed rather than blocking: [issue #1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307). The default candidate list is drawn from around the **device** and then ranked by distance from the **Bite**. For the Ronda Bite it offered eight Bern restaurants at 1532 to 1537 km from the Bite. The list is not mis-ordered, it is incapable of containing a correct answer.
- Cause established in the code during the run: `nearbyRestaurants` derives from the Bites already in the store, which are the Home feed's Bites around the device, and `openRestaurantSelector` only asks Google for places near the Bite `if (!hasLocalRestaurants && position)`. The gate answers "do we have any restaurants at all" where the question is "do we have any restaurants near the Bite", so **having restaurants near home actively suppresses the lookup that would find the right one abroad**. The more a user posts near home, the more reliably the feature fails away from it.
- The same theme reaches the manual search, recorded as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307#issuecomment-5243886757) rather than a second issue: searching `Toro Tapas` returned results in Spain, the UK, Switzerland and the USA, so the query is a global text search that the ranking sorts afterwards, and `Toro Tapas Ronda` itself was absent. The in-app hint asks the user to compensate manually by typing the city.
- The hint's advice does work: searching `Toro Tapas Ronda` returned exactly one result, `Carrera Espinel, 7, 29400 Ronda, Málaga, Spain`, at `0.9 km vom Bite`. That 0.9 km is also an independent cross-check that the EXIF position is genuinely correct, since the photo's coordinates and the restaurant's street address agree to within 900 metres.
- Selecting it moved the source from `Aus Bild` to `Aus Google` and held the currency at `Euro`, which is the Run-4 contract reached again by the Run-5 route.

#### Session 4 - Save, and a Run 5 evidence gap closed

- Saving produced a loading spinner on the action, a success toast, and a spinner in the feed while the Bite settled. **This closes an evidence gap Run 5 recorded rather than passed**: Run 5 could not evidence the in-flight save progress state or the duplicate-submit lock because its burst capture ended before the tap.
- The Bite appeared exactly once at the top of the feed as `Run 6 Test`, `TORO TAPAS RONDA`, `1539 KM`, `RONDA, SPANIEN`, with four stars and its photo retained.
- Result: pass for the online Bite baseline, foreign position adoption, foreign currency, position source persistence, restaurant selection, and the save progress contract on build 93.

### Session 5 - Crashlytics, The #1232 Instrumentation, And The End Of The dSYM Question

Taken about an hour after the Session-2 trigger, deliberately, because Run 5 established that non-fatals surface slowly.

- Crashlytics recognized `1.0.1 (93)` as the latest release with one active user. Non-fatals for the period: 13 events across 3 users, with the largest daily bar on 10 August.
- **The #1275 instrumentation works exactly as Run 5 agreed it should.** The event payload reads `Bite details load failed (biteId=15f0612d-7846-4310-b82a-c30dada12ba2 branch=not-found origin=/gallery error=BiteNotFoundError: Bite ... does not exist.)` on `1.0.1 (93)`, iOS 26.6.0, iPhone 12 Mini, timestamped to the Session-2 reproduction. The biteId, the branch taken and the navigation origin are all present, which is precisely the Session-16 specification.
- It also settles the classification independently of the alert: the read settled as `BiteNotFoundError` and took the `not-found` branch, which is why only `Zurück` was offered.
- **[Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)'s dSYM question is resolved, and it is not a defect.** Evidence recorded as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181#issuecomment-5244043016). `dwarfdump --uuid` against the build-93 archive identifies every UUID in the console table: `D4B24778` is `FirebaseCrashlytics.framework`, `AFEAF1AC` is `Capacitor.framework`, and the app's own binary is `61604CE0`, which the console lists as **Uploaded** with the table reporting **0 warnings**.
- **Run 5's central hypothesis is disproved by its own experiment.** Run 5 proposed that a non-fatal originating in app code would resolve the table. Run 6 produced that non-fatal, and its stack contains Crashlytics frames only. In a Capacitor app the app code is JavaScript, so an error recorded through `recordException` crosses into native only inside the plugin and can never produce an app-binary frame. The app dSYM will stay `Unknown` with 0 events indefinitely, and the two framework UUIDs will stay `Missing (optional)` indefinitely. Neither is a symptom of anything.
- One inference made during this run and corrected within it, recorded so it is not repeated: the second missing UUID changed between build 92 (`AD1CE4AB`) and build 93 (`AFEAF1AC`), which looked like the app binary being rebuilt. It is `Capacitor.framework`, recompiled because #1259 modified the Xcode project. Run 5's original reading was right.
- Consequences for the charter, not just for the issue: symbolication is in working order for the only case that needs it, a real native crash, and there has been none in any run. Release-candidate runs should stop recording dSYM presence as an open blocker. The diagnostic value of a non-fatal in this app lives in its **message payload** rather than its stack, so future instrumentation should keep putting state into the message the way #1275 does.
- Result: pass for Crashlytics health, build recognition, non-fatal delivery from iOS, and the #1232 instrumentation. The dSYM half of #1181 is closed as not-a-defect; what remains in that issue is its actual title, signed Android and iOS build jobs in CI, which no device test can verify.

### Session 6 - Review Threads And Replies

The #1298 review threads are new in build 93 and had never been tested. The thread was exercised across two accounts and two platforms: the main account `Mo` wrote a review from the desktop web app, and the Bite owner `run5mo` replied from the phone.

- The empty state on the owner's own Bite offers `Bewertungen`, a `Bewertung schreiben` box, a correctly disabled `Deine Bewertung hinzufügen`, and `Bite bearbeiten`.
- A review written on desktop arrived, and a **push notification for a new review** was delivered to the device. This is a notification type no previous run has exercised.
- **The thread renders correctly.** The reply is indented under its root with a left rule, carries an `ERSTELLER` badge identifying the Bite owner, is timestamped `jetzt`, and the composer closes on submit. Replying to a reply is offered at both levels.
- The reply notification was addressed to the review's author, the main account, which is the correct fan-out target.
- **[Issue #1272](https://github.com/muhammedgaygisiz/travellers-apps/issues/1272) is verified fixed on two languages at once**: relative timestamps rendered `15 dk. önce` and `şimdi` for the Turkish main account on desktop, and `vor 4 Min.` and `jetzt` for the German session on the device. Run 5 recorded English `just now` inside a German session.
- Result: pass for review creation, threading, replies, the creator badge, and reply notification addressing, with two findings filed below.

#### Session 6 finding - reviews publish the author's real name

- Raised by the tester from the desktop, not from the matrix: the review is attributed to `Muhammed ...`, the account's real name, where its BiteTribe display name is `Mo`. Filed as [issue #1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308).
- Cause established during the run. `review-api.service.ts` writes `author: user?.displayName` from `authService.getUser()`, which is the **Firebase Auth** user whose `displayName` comes from the Google or Apple sign-in and holds the legal name. The display name the product means lives on the Firestore user document. This is the same two-names confusion that `aa623f19` fixed on the profile, reappearing on reviews.
- **Assessed as a privacy defect rather than a cosmetic one**, and recommended for the #1177 blocker conversation rather than the general backlog. Onboarding asks for a display name explicitly and the privacy step then asks whether the profile should be public at all, so a user who deliberately chooses a pseudonym still has their legal name published to every reader of every review they write. The control the product offers does not cover this path.
- Two aggravating details: `author` is denormalised onto the review document at write time, so **every review already written stores a real name** and fixing the code does not fix the stored data; and the same assignment is used for replies, so it repeats on every message in a thread.
- **Why five runs missed it**: the two names coincide for email and password accounts, which is what every disposable run account has been. It is only visible on a social sign-in, and the main account was only ever used from desktop in passing.
- The owner's reply on the device showed the `ERSTELLER` badge and no name at all, consistent with `run5mo` being an email and password account with an empty Auth `displayName`.

#### Session 6 finding - the reply field has almost no room to type

- Raised by the tester while replying on the phone. Filed as [issue #1309](https://github.com/muhammedgaygisiz/travellers-apps/issues/1309).
- `review-thread.component.html` renders the reply input as an `ion-textarea` with a `label` and no `labelPlacement`, so Ionic places the label inline at the start of the control and the input shares its line. The label is `Antwort an {{name}}`, so **the space left to type shrinks as the author's name grows**, and it is worst for the users whose names are longest. `rows="2"` gives it less height than the review composer directly below, which is full width.
- The two composers therefore give the same action visibly different room depending on whether it is a review or a reply.
- Recorded and dismissed, not a finding: text appearing to spill outside the field was the iOS autocorrect popup, confirmed with the tester rather than assumed.
- Observation carried from Run 5 rather than re-filed: the device holds push registrations for more than one account, so a notification addressed to the main account can surface on a phone currently signed in as the disposable one. The addressing is correct and the tester assessed the behavior as intended; the residual question of stale per-device tokens is left recorded rather than opened.

### Session 7 - Search By Country And Paged Results

- The search surface now offers five modes: `Benutzer`, `Bite`, `Restaurant`, `Stadt` and the new `Land`, plus a list and map toggle.
- **[#1296](https://github.com/muhammedgaygisiz/travellers-apps/issues/1296) country search passes.** `Land` presents a country selector rather than free text, showing the flag and the **localized** country name `Spanien` rather than a raw `Spain` or an ISO code, and returned Spanish Bites with their thumbnails and restaurants.
- **[#1297](https://github.com/muhammedgaygisiz/travellers-apps/issues/1297) paging passes.** The result list scrolled smoothly from the start of the alphabet through to `Yema sobre bizcocho de boletus` at the end, with no stall, no visible gap between pages, and no loading state left behind.
- Index freshness confirmed: a `Bite` search for `Run 6` returned the Bite created twenty minutes earlier, with its thumbnail and `Toro Tapas Ronda`.
- Result: pass for country search, paged results, and search index freshness on build 93.

### Session 8 - Offline Reads And The `unavailable` Branch

Executed under Airplane Mode, so iPhone Mirroring drops and the tester reported directly, as in Run 5 Session 14.

- Correct behavior worth recording rather than passing over: Bites already in the feed **open normally while offline**, because the read resolves from the store rather than the network. The `unavailable` branch is therefore not reachable through the feed, which is why it needed a Bite that exists but is not cached.
- Reached through the local gallery instead. Opening a gallery photo's Bite while offline produced the correct alert: `Bite konnte nicht geladen werden` with **two** actions, `Zurück` and `Erneut versuchen`, which is the branch `reportBiteUnavailable` implements and the one the deleted-Bite alert correctly withholds.
- Pressing `Erneut versuchen` while still offline dismissed and re-presented the alert, which is the intended loop: the retry puts the read back in flight, the effect clears `reportedFailure`, and the next failure is reported again rather than leaving the page silent.
- **The strongest single piece of evidence in this run for #1232.** Restoring connectivity and retrying the _same_ Bite produced the **not-found** alert instead, with only the way back, because that Bite had in fact been deleted. The same `biteId` therefore yielded `unavailable` while the network was down and `not-found` once the read could actually settle. `classifyBiteLoadFailure` distinguishes the two on a real device and re-evaluates on retry rather than caching its earlier verdict. Run 5 recorded that this separation could not be made without a log or a debug build.
- Result: pass. Together with Session 2, [issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) is now verified end to end: the not-found branch, the unavailable branch, the retry loop while still failing, and re-classification on retry.
- Gap, recorded rather than claimed: a retry that **succeeds** was not observed, because the Bite used turned out to be deleted. The success path of `Erneut versuchen` remains unproven.

### Session 9 - Account Deletion

Deferred by Run 5 and executed here, on the retained disposable account, which is also this run's cleanup.

- Pre-deletion snapshot: `run5mo`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`, public profile, PRO, Folgst 0, Follower 1, and **three** Bites: `Run 6 Test` and `Test Online` at Toro Tapas Ronda, and `Test` at Johny's Road Kitchen in Bern.
- **The deletion screen is the strongest consent surface in the app.** It names the account and its sign-in method, states irreversibility in red, and enumerates what is destroyed: profile, display name and photo; the user's own reviews and likes; bucket lists and BiteTrail ratings; follow relationships in both directions; settings and push registrations.
- It also has a `Was bleibt` section, which **corrects a standing error in this charter**: `Deine Bites bleiben ohne deinen Namen auf BiteTribe, damit die Bucket-Listen und BiteTrails anderer weiter funktionieren.` Bites are anonymised, not deleted. Run 5's cleanup inventory recorded that its two Bites "must be removed with it", which was simply wrong about how deletion works, and Run 4's surviving "three anonymous Bites" were this contract operating correctly rather than residue.
- Three gates before anything is destroyed: the page itself, a confirmation dialog naming the account again, then **re-authentication with the password**. Deletion took roughly ten seconds under a loading state and landed on the Start screen.
- Cascade verified from the surviving main account rather than assumed:
  - The follow edge is gone: `run5mo` is absent from the following list, and the aggregate agrees with the list at 50 entries, so the counter decremented correctly. Deliberately checked against the list because #1310 had just shown an aggregate disagreeing with its own list; this one does not.
  - The Bite survives at its shared URL with its photo, rating, restaurant, `Ronda, İspanya`, and a working currency conversion of `CHF4.65 / €5.00`, with **no author attribution** anywhere on it.
  - **The thread edge case, which only exists in this build, behaves correctly.** The review written by the surviving main account remains, timestamped and still replyable. The reply written by the deleted account is gone. The thread renders as root-only, with no orphan, no broken layout and no placeholder for a missing user. `Deine Bewertungen` cascaded without touching another user's content on the same Bite.
- Result: pass for the account-deletion contract, its consent surface, its re-authentication gate, and its cascade, including the new review-thread case.

### Session 10 - Fresh Registration, Onboarding, And The Verification Mail

A second disposable account, `run6mo`, was registered after the deletion, because the email fixes cannot be reached from a verified account. It also reached two onboarding changes nothing had verified.

- Registration opened the assistant at `Step 1 of 7` in English, which is correct for a fresh account and matches Run 5.
- **[Issue #1262](https://github.com/muhammedgaygisiz/travellers-apps/issues/1262) is verified fixed.** The default currency suggestion arrived as `Swiss Franc`. Run 5 got `British Pound` on this same device, because the old code read the region out of the `en-GB` interface language rather than the device. Deriving it from the `Europe/Zurich` time zone gives the right answer on precisely the device whose Region and interface language disagree, which is the case that exposed the bug.
- **#1291's home base is folded into the location step rather than added as an eighth**, keeping the assistant at seven steps. `Deine Heimatstadt` is explicitly distinguished from the device position: `Das ist nicht dein Gerätestandort. Es ist der Ort, den du dein Zuhause nennst`.
- The copy on that step **adapts to the visibility choice made two steps earlier**: with Private selected it reads `Dein Profil ist privat, also bleibt deine Heimatstadt genau wie der Rest deines Profils von öffentlichen Bereichen fern`, and it states that an empty field simply shows no location. Recorded as a positive finding, since the charter otherwise only records copy when it is wrong.
- Checked and dismissed rather than filed: the `Zurück`/`Weiter` footer appeared to sit over the home-base description. It is a sticky footer over scrollable content and the field is comfortably reachable.
- Unchanged from Run 5, re-confirmed: the location step still opens offering `Standort freigeben` even though the app-level permission is already granted, where the notification step recognises its grant.
- Onboarding completed into a German Home with the coach-mark sequence and the email verification reminder.

#### Session 10 - The verification mail, one fix confirmed and one refuted

- **[Issue #1264](https://github.com/muhammedgaygisiz/travellers-apps/issues/1264) is verified fixed.** The resend was triggered after the account language was set to German, which is the exact ordering that exposed the defect in Run 5, and the mail arrived fully German: subject `Bestätige deine Bite-Tribe-E-Mail-Adresse`, a German body, and the link label `E-Mail-Adresse bestätigen`.
- **[Issue #1265](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265) is not fixed in what the recipient sees, and should be reopened as a configuration issue.** The `From` header still reads `Muhammed Veysel Gaygisiz <muhammed.gaygisiz@bitetribe.app>`, a personal name and mailbox. Evidence recorded as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265#issuecomment-5244800289).
- **The code is correct and was overridden in transit**, which the run established rather than guessed. `createRawEmail` builds `From: ${SENDER_NAME} <${from}>` with `SENDER_NAME = 'Bite Tribe'`, and throws if the sender secret is missing. The delivered display name is not `Bite Tribe` but the delegated Workspace user's own name, a string the function cannot produce, so Gmail replaced the header rather than the code mis-building it.
- This confirms, by a real send, the failure mode Run 5 recorded when the fix was made: Workspace must accept the configured address as a `Send mail as` alias of the delegated mailbox, or Gmail rewrites `From` back to the authenticated identity. **No unit test can catch this**, because the rewrite happens after the code under test has already produced a correct header, so a test asserting the built header passes while the delivered mail is wrong.
- Result: pass for mail localization, fail for sender identity, with the failure relocated from the code to the Workspace configuration.
- The second disposable account was deleted immediately afterwards, re-exercising the deletion path on an account with no Bites, no followers and an unverified email. Behavior was identical and marginally faster.

### Run 6 Outcome

- The physical iOS execution covered build and device identity, cold start, the deleted-Bite path and its instrumentation, settings and persistence, save semantics, Bite creation with a foreign photo position, the reworked position source modal, restaurant selection, review threads and replies across two accounts and two platforms, country search and paged results, offline reads, Crashlytics, account deletion and its cascade, a fresh registration and onboarding, and the verification mail.
- **Both Run-5 P0 findings are resolved, and build 93 is the first build in this charter's history to carry no inherited P0.** [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) is verified end to end: the not-found branch, the unavailable branch, the retry loop, and re-classification on retry, plus its Crashlytics instrumentation delivering the agreed payload. [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)'s dSYM question is closed as not-a-defect, with the app's own dSYM confirmed uploaded and the missing rows identified from the archive as vendor frameworks that no amount of app instrumentation can ever resolve.
- **Fifteen previously filed issues were physically verified as fixed**: #1232, #1260, #1261, #1262, #1263, #1264, #1266, #1267, #1268, #1269, #1272, plus the create-click and photo-preview loading states from #1292 and #1276, and the new #1296 country search and #1297 paged results. #1245 was re-verified for a third run.
- **Eight new issues were filed**, [#1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303) to [#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310): the app reporting version `0.0.0` and storing it on every user document, the deleted-Bite alert outliving its page, toasts that never signal failure, the position source modal never showing the position being selected, restaurant suggestions drawn from the device rather than the Bite, reviews publishing the author's real name, the reply field having almost no room to type, and the profile Bite count going stale after a save.
- **One shipped fix was refuted rather than verified.** #1265's sender identity is unchanged in what the recipient sees, because Gmail rewrites the `From` header the correct code produces. It was **reopened during the run** as a configuration issue rather than a code one.
- Reopening it exposed a board behavior worth knowing, since it silently undid a deliberate action: the issue reopened successfully, was verified open, and closed itself again seven minutes later when its `Priority` field was set, because its board `Status` was still `Done` and the project's auto-close workflow resolved the disagreement against the issue. The fix is to move `Status` off `Done` before reopening. Written up in [[GitHub Project Board And Issue Handling]].
- Issue triage was recorded on GitHub rather than only in this charter, which is new. Runs 3 to 5 expressed severity in issue text alone, so #1229 and #1244 carried nothing distinguishing them from cosmetic findings once the run was over.
- **Priority lives in the `Priority` field of the `Bite Tribe` project board, not in labels.** It is a single-select field with `P0` to `P5`, and setting it requires adding the issue to the board first, since `gh issue create` does not do that. All nine issues from this run were added and set: `P0` on #1308, `P1` on #1303 to #1307, #1309, #1310 and the reopened #1265. Labels stay for type only, `bug` or `enhancement`, plus `security` on #1308 because it is a PII disclosure rather than a functional defect.
- Recorded because it was got wrong during this run and cost a correction: priority labels were created and applied first, then removed. The convention is now written down in [[GitHub Project Board And Issue Handling]], which this charter defers to for anything issue-tracking related.
- **One new P0, decided during the run**: [#1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308) was raised by this run as a recommendation and **accepted as a release blocker**. It publishes users' real names to every reader of every review, defeats a privacy control the product explicitly offers, and the data already written is permanently wrong. Nothing malfunctions, which is why it took a decision rather than a test result to classify it. It belongs to #1177.
- One standing charter error was corrected: **deletion anonymises Bites rather than removing them**, which is documented on the deletion screen itself and retroactively explains Run 4's surviving anonymous Bites. Run 5's inventory was wrong on this point.
- One standing charter finding was withdrawn: the `PRO` card on a free account is a **deliberate beta grant**, not a defect, and Run 5's argument that #1127's severity was raised by it does not hold. Corrected on the issue.
- Evidence gaps recorded rather than silently passed: the localized permission prompts are verified in the artifact but not at runtime, because the device is English-first and `en.lproj` is byte-identical to the `Info.plist` fallback, so an English device cannot distinguish a working localization chain from an absent one; a **successful** `Erneut versuchen` was never observed, because the Bite used turned out to be deleted; #1273's login pending state was never exercised, since no password sign-in happened; the refused App Check token still needs an invalid-token artifact; and Analytics DebugView still needs a dedicated Xcode debug launch.
- Not executed: Bucket Lists, menu drafts, the privacy policy, the web deep link, follower push tap, production Analytics Realtime, the Android and web halves, and the Playwright suites.
- **Release-candidate result: fail, on one new P0.** Both inherited P0s are resolved and nothing found in this run prevents registration, login, Bite creation with a photo, or app start, so build 93 is materially healthier than any build before it. It is not the release candidate because [#1308](https://github.com/muhammedgaygisiz/travellers-apps/issues/1308) was accepted as a blocker. The Android and web halves remain unexecuted regardless.
- Worth recording for the next run, because the shape of the failure changed: runs 3, 4 and 5 failed on defects that broke the app. Run 6 fails on a defect that works exactly as written and should not. That is a different class of finding, and it was reachable only because the run used a social sign-in account on a second surface rather than the disposable email account it tested everything else with.

### Run 6 Cleanup Inventory

- **Both disposable accounts were deleted during the run.** `run5mo` (`muhammed.gaygisiz@bitetribe.app`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`) and the Session-10 account `run6mo` are gone from Authentication, and the deletion cascade was verified rather than assumed. Unlike Run 5, this run leaves no live account behind.
- The `run5mo` deletion left three **anonymised** Bites behind, since deletion anonymises rather than removes: `Run 6 Test` and `Test Online` at Toro Tapas Ronda, and `Test` at Johny's Road Kitchen in Bern, each with its Storage object. **The tester removed these directly at the end of the run**, so unlike the Run-4 anonymous Bites they do not join the standing inventory.
- The main account's review on the anonymised `Run 6 Test` Bite, whose reply the cascade had already removed, went with that Bite.
- **Run 6 therefore leaves nothing behind of its own**: no live disposable account, no test Bites, no Storage objects. The only standing inventory is Run 4's.
- The main account's following count returned correctly and is unaffected.
- The Run-4 inventory still stands and must not be removed.
- The device app container still holds the Run-4 local gallery. **It can now be cleared**: it existed to give #1232 a fixture, and #1232 is verified fixed on this build. A future run needing that path must manufacture a fixture again, as Run 4 did.

## iOS Execution - Build 92 (Run 5)

### Entry State

- TestFlight build 92 was verified on screen, not by report: the tester mirrored the iPhone to the Mac, so every observation in this run is read directly from the device screen. TestFlight showed `BiteTribe 1.0.1 (92)`, and Settings showed `Mo's iPhone`, iPhone 12 mini, iOS 26.5.2 - the same hardware and OS as runs 3 and 4, so the results are directly comparable.
- Build 92 was installed **over** build 91. There was no fresh install, so the app container survived. Two consequences: the Run-4 `AppData/Documents` evidence for [issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) is intact and the Run-5 entry prerequisite is satisfied without an Xcode archive, and the Run-4 local gallery still holds the deleted-Bite photos that give [issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) a ready fixture. First-run install behavior is therefore out of scope for this run, exactly as in Run 4.
- Run 5 is a complete iOS regression pass after the reported fixes for the six Run-4 P0 findings. Build 92 covers the changelog range `b3aef3ab` to `ac217b99` and contains #1252 for #1229, #1248 for #1244, #1249 for #1246, #1257 for #1245, plus #1255 email-verification re-sync and #1253 desktop feed layout. Closure state on GitHub does not replace physical verification.
- Two entry findings from the repository state, recorded before execution:
  - [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) was reopened on 6 August for the deleted-Bite `Open Bite` hang and closed again on 7 August with no fix commit. `details.page.ts` is unchanged since `b3aef3ab`, the build-91 code that produced the hang, so this run treats the deleted-Bite path as unverified and re-tests it against the surviving Run-4 fixture.
  - `738901be`, which adds the localized iOS `InfoPlist.strings` permission prompts, landed after build 92's changelog end rev `ac217b99`. Whether the distributed artifact shows localized or English permission copy depends on the commit the archive was cut from, which is why that SHA has to be recorded.
- **Source of the distributed artifact, reconstructed during Session 19 and recorded here because four consecutive runs have started with this gap.** The archive `App 07.08.26, 21.57.xcarchive` was created on 7 August at 21:57:51 with `CFBundleShortVersionString 1.0.1` and `CFBundleVersion 92`. The reflog shows the tree was on branch `bump-version-92` with `HEAD` at `ac217b99`, and the build-number bump was only committed at 22:22 as `c563d58d`, merged to develop at 22:44 as `47faadba`. Build 92 is therefore `ac217b99` plus an uncommitted working-tree bump: content-equivalent to `47faadba`, with the changelog range `b3aef3ab..ac217b99` accurate, but corresponding to no commit that existed when it was built. Reconstruction required a local reflog on one workstation, which is exactly the traceability [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) exists to close.
- Settled from the artifact rather than inferred: `738901be`, which adds the localized iOS `InfoPlist.strings`, was committed on 8 August at 01:13, after the archive. The archived `App.app` contains only `Base.lproj`. Build 92 therefore shows **English** system permission prompts, and the localized prompts cannot be verified until the next build.
- The TestFlight `What to Test` copy named the desktop feed layout, deep links, and push notifications, which matches the build-92 changelog.
- [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) is still open, so build-92 dSYM presence in Crashlytics is an explicit check rather than an assumption.
- The three anonymous Run-4 Bites remain preserved under the Run-4 cleanup inventory and must not be removed during this run.
- The repository branch `1256-chore-test-run-5` was clean when execution began.
- Result: executed, release-candidate fail. See the Run 5 Outcome section below.

### Session 1 - Build Identity, Session Restore, And Unauthenticated Cold Start

- TestFlight showed `BiteTribe 1.0.1 (92)`, expiring in 90 days, with `What to Test` copy naming the desktop feed layout, deep links, and push notifications.
- Settings confirmed the device as `Mo's iPhone`, iPhone 12 mini, iOS 26.5.2.
- A cold launch from the home screen, after a full force quit, restored the existing authenticated session and opened the German Home feed. The feed settled with real content and a resolved distance to the Bite's location, so no endless loader and no stale location error appeared.
- The signed-in account was identified on the profile page as the main account `Mo` / Muhammed Gaygisiz, Bern, showing 604 Bites, 48 following, and 33 followers. The following count of 48 independently corroborates the Run-4 deletion evidence, which recorded the cascade moving the main account from 49 to 48.
- The account identity was not discoverable from the app menu and required navigating to the profile. Filed as future feature [issue #1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260); it did not block the run.
- Logout reached the Start screen, and Start persisted across a complete termination and relaunch.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: the Start screen mixes languages in one view, with a `Log In` primary action beside a `Registrieren` secondary action in an otherwise German session.
- Result: pass for build identity, device identity, authenticated session restoration, logout persistence, and unauthenticated cold start.

### Session 2 - Fresh Registration Gate

- The Run-5 account is `muhammed.gaygisiz@bitetribe.app`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`. It is the disposable account for this run and every first-run check below was executed with it unless stated otherwise.
- The registration form rendered in German with all four password rules satisfied and visibly confirmed.
- One submit produced a visible spinner, observed by the tester. The screen transition itself fell between two consecutive burst frames, so registration completed in under roughly 2.4 seconds, far inside the 60-second expectation. Duplicate-submit locking was not separately evidenced because the request never stayed in flight long enough to attempt a second tap.
- Registration opened the mandatory onboarding assistant at `Step 1 of 7`, with the German success toast `Registrierung erfolgreich! Bitte überprüfe deine E-Mail, um dein Konto zu verifizieren.`
- Exactly one matching new user existed in production Firebase Authentication.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: the first onboarding page rendered in English while the success toast over it rendered in German. A fresh account starting in English matches Run 4, so the toast is the outlier and appears to carry the previous session's language.
- Result: pass; Run 5 continues to the full onboarding and regression matrix.

### Session 3 - Onboarding Identity

- The identity explanation rendered in English, which is the expected fresh-account language before the later language step, and was understandable.
- The unique test profile name `run5mo` was accepted, with an explicit green `Display name is available.` confirmation.
- A profile photo was selected from the media library and rendered correctly in the preview. iOS showed no new photo permission prompt, which is expected because build 92 was installed over build 91 and the app-level permission survived.
- Continuing opened Profile visibility.
- No error, technical text, or raw translation key appeared.
- Finding, filed rather than blocking: between confirming the chosen photo and the preview rendering, the avatar area is empty with no pending state, so the photo appears to vanish before it appears. `identity-step.component.html` switches straight from the fallback icon to the `img` element as soon as the form control holds the value, and the element paints nothing until its own `load` event fires. Filed as [issue #1261](https://github.com/muhammedgaygisiz/travellers-apps/issues/1261).
- Result: pass, with #1261 recorded against the photo preview.

### Session 4 - Onboarding Profile Visibility

- The public/private explanation was understandable, and it named the concrete consequences of a public profile: leaderboard participation, followers, and attributed Bites.
- Tapping the `Go public` row on its description text, not on the radio control, moved the selection correctly, and tapping the `Stay private` row the same way moved it back. Both resulting states were visually unambiguous through the filled radio and the highlighted border.
- The run was completed as Private, matching the Run-4 baseline so the two runs stay comparable. The profile is made public later for the follower push test.
- Continuing opened Currency.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: `Next` is disabled until the user makes an explicit selection, even though `Stay private` is rendered as preselected. The initial radio state is therefore cosmetic rather than a real selection. This is defensible for a privacy decision and is recorded rather than filed.
- Result: pass; Private persistence remains to be checked on the completed profile.

### Session 5 - Onboarding Currency

- The step explained the default currency and the optional favorites clearly, under copy stating that one was picked from the device.
- The default currency arrived prefilled as `British Pound`. The favorite currency was set manually to `British Pound`, and the selected state was clear.
- GBP is the same preferred currency Run 4 used, so the later foreign-place check still exercises a Bite whose currency must differ from the account default.
- Continuing opened Language.
- No error, technical text, or raw translation key appeared.
- Finding, filed rather than blocking: the device is set to Region `Switzerland` in iOS, so the expected suggestion is `CHF`. The suggestion is derived from `navigator.language`, and reaching `GBP` requires an explicit `GB` region subtag because the language-only fallback maps `en` to `US` and would have produced `USD`. The device therefore reported `en-GB`, and the app read the region of the interface _language_ instead of the device region. Filed as [issue #1262](https://github.com/muhammedgaygisiz/travellers-apps/issues/1262).
- The same issue recorded a charter defect against check 4, `currency prefill from position`. Resolved while fixing #1262: check 4 describes the _Bite_ currency, which really is prefilled from the Bite position through the `getCurrencyByPosition` function, and Session 12 evidences that path working. The finding had conflated it with the onboarding _account default_ suggestion, which has no position at that point in the flow. Check 4 now names both prefills and their separate sources.
- Fixed in #1262: the suggestion is derived from the device time zone, and only falls back to the locale for an unmapped zone. The time zone is the one region signal an iOS web view gets for free — `navigator.language` keeps the `en-GB` variant the user reads in whatever the device Region says, and no web API exposes the Region setting itself. It is also the closest permission-free stand-in for position, so onboarding does not have to spend a location permission two steps before it asks for one. The reported device would now suggest `CHF` from `Europe/Zurich`. Retest on a device whose Region and interface language disagree.
- Manual override of the _default_ currency was not exercised here, because the prefill already matched the currency this run wants. Settings covers the override path later.
- Result: pass for the step's mechanics, with #1262 recorded against the suggested value. GBP persistence remains to be checked after onboarding.

### Session 6 - Onboarding Language

- English was prefilled from the device, which is correct: English is first in the iPhone's Preferred Languages. The language prefill therefore reads the device correctly, which is a useful contrast to the currency suggestion in [issue #1262](https://github.com/muhammedgaygisiz/travellers-apps/issues/1262) and narrows that issue to the currency path alone.
- Selecting German switched the entire step to German immediately, matching its own promise that the app changes language at once.
- Build 92 improves on Run 4 here: Run 4 had to pass through a visible loading transition on this step, and build 92 switched without one.
- No error, technical text, or raw translation key appeared, and the whole page rendered in German.
- Result: pass for an actual onboarding language transition.

### Session 7 - Onboarding Location

- The Standort explanation was fully German, understandable, and named four concrete reasons for the permission rather than asking for it abstractly.
- The activation action responded immediately and produced an unambiguous green `Standort ist aktiviert.` state, after which `Weiter` became enabled.
- iOS showed no new permission dialog, which is expected because the app-level grant survived the update from build 91.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: the step opens as though location had never been granted, with `Weiter` disabled, even though the permission was already active and the Home feed had already resolved a real distance before onboarding began. The notification step, by contrast, recognizes an existing grant. The two steps therefore treat pre-existing permissions inconsistently. This matches Run 4 and is not a build-92 regression.
- Result: pass.

### Session 8 - Onboarding Notifications

- The German notification explanation was understandable and named concrete reasons: leaderboard changes, new followers and reactions, and per-device management in settings.
- The page opened already showing the green `Benachrichtigungen sind aktiviert.` state with `Weiter` enabled, correctly recognizing the app-level iOS permission retained through the update. No contradictory activation prompt appeared.
- This is the direct comparison that confirms the Session-7 observation rather than leaving it as an impression: with both permissions already granted, the notification step recognizes the grant and the location step does not.
- No error, technical text, or raw translation key appeared.
- Result: pass for onboarding state recognition; push-token ownership and delivery to the new account remain to be tested end to end.

### Session 9 - Onboarding Completion And Coach Marks

- The Fertig page rendered fully in German and personalized the confirmation with the chosen display name, `Alles bereit, run5mo!`.
- Completion opened Home without a hang and started the coach-mark sequence automatically. The first mark was already on screen before the feed images finished loading, so the sequence did not wait on content.
- All four coach marks were visible, targeted the correct element, used understandable German copy, and each offered a single `Verstanden` action: `Bites entdecken` on the feed, `Entdecke BiteTribe` on the menu control, `Gestalte deinen Feed` on the search, Bitemap, and sort filter row, and `Einen Bite teilen` on the create action.
- The final mark closed the sequence and left a clean, fully rendered Home.
- The email-verification reminder was visible for the new unverified account, with a resend action.
- No error, technical text, or raw translation key appeared.
- Result: pass.

### Session 10 - Onboarding Persistence

- The completed profile displayed `run5mo`, the selected photo, and `Privates Profil` with its German explanation, so the Session-4 visibility choice survived onto the real profile. Counts were 0 Bites, 0 following, and 0 followers, as expected for a fresh account.
- Settings persisted German, `British Pound Sterling` as both the preferred currency and the currency favorite, and an active current-device notification switch. `Einstellungen speichern` was correctly inert with no pending change.
- The email-verification reminder was visible for the new unverified account, on both Home and Settings, with a resend action.
- No error, technical text, or raw translation key appeared.
- Physical confirmation of an existing open defect: the two-minute-old free account displays a `PRO` badge on the profile and a highlighted `PRO` card under `Kontotyp` in Settings. This is [issue #1127](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127), where `createUserOnAuthCreate` writes `subscriptionTier: 1`. Evidence and one correction were added as an [issue #1127 comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127#issuecomment-5225707129): that issue assumes the wrong tier is invisible today, but it is rendered to the user on two separate surfaces. The `Kontotyp` cards were checked in `settings.component.html` and carry `role="status"` with no click handler, so this is a display defect and not a client-side entitlement control.
- Finding, filed rather than blocking: the push-device row reads `iOS 18.7 · 1.0.1 (92)` on a device running iOS 26.5.2. `describeCurrentInstallation` derives the description from `navigator.userAgent` by deliberate design, and WKWebView freezes the OS version it reports there, so the parser faithfully reports a value the user agent invented. The app version is correct. Filed as [issue #1263](https://github.com/muhammedgaygisiz/travellers-apps/issues/1263); the value is also persisted with the push token, so stored data inherits it. The fix approach was decided during the run and recorded on the issue: read the version from the native `@capacitor/device` plugin rather than the user agent, and do not fall back to omitting the version.
- Result: pass for persistence of all inspected onboarding choices, with #1263 filed and #1127 physically confirmed.

### Session 11 - Email Verification

- Resend showed a clear success confirmation and then disabled the resend action, so duplicate sending was locked.
- Exactly one new message arrived per request, and the newest link completed verification successfully on a desktop.
- Reactivating the iPhone synchronized the verified state and removed the reminder from Home and Settings without an app restart, which exercises the build-92 change in [issue #1255](https://github.com/muhammedgaygisiz/travellers-apps/issues/1255).
- No error, technical text, or raw translation key appeared.
- Result: pass for the full verification journey, with two mail defects filed below.

#### Session 11 note - the ordering that found the mail defects

Run 5 deliberately verified email _after_ switching the app to German, where Run 4 verified before touching the language. That single change made two mails comparable across a language change and exposed defects Run 4 could not have seen, because in Run 4 both mails were legitimately English. Future runs should keep verification after the language step for this reason.

- The registration mail at 12:02 came from `noreply@bitetribe.app`, subject `Verify your email for Bite Tribe`, in English with `lang=en` on the link. Correct, because the account was still English at that moment.
- The manual resend at 12:37 came from `muhammed.gaygisiz@bitetribe.app`, subject `Verify your Bite Tribe email address`, in English while the account language was German.
- [Issue #1264](https://github.com/muhammedgaygisiz/travellers-apps/issues/1264), language: `google-workspace-email.ts` holds `SUBJECT`, `BODY`, and the link label as hardcoded English constants, and `resendEmailVerificationForUser` never reads the recipient's language, so there is no value to localize with. Every user of the eleven shipped languages receives this account-security mail in English.
- [Issue #1265](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265), sender identity: the resend `From` header is built from the delegated Google Workspace user, so a personal mailbox is published to every user who requests a resend, and the same operation presents two different senders and two different subjects. The registration mail's `bite-tribe.firebaseapp.com` action link is recorded on the same issue as a related brand and trust decision.
- Fixed in #1265: the visible sender is its own setting, `GOOGLE_WORKSPACE_SENDER_ADDRESS`, and the delegated mailbox no longer reaches a recipient. The two subjects are reconciled towards the localized catalog wording by editing the Firebase Auth console template, and the action link is deliberately left on the default domain until after 1.0.1 because it is also the OAuth redirect origin. See [[issue-1265]]. Retest needs a real send: Workspace must accept the address as a `Send mail as` alias of the delegated mailbox or Gmail rewrites `From` back, which no unit test can catch.
- Neither is release-blocking; both are recorded against the mail path rather than the app.

### Session 12 - Online Bite With A Foreign Position And Foreign Currency

Run 5 reordered the matrix here, taking Bite creation before the remaining permission and settings sessions, so the six Run-4 P0 re-verifications are reached earlier in the run. The deferred sessions are executed afterwards.

- The chosen gallery photo was taken in Ronda, Spain, while the device was in Bern. The form adopted the photo's position: the `Standort` source showed `Aus Bild` and the map resolved to Ronda, confirmed by Spanish street names.
- This is the charter's `Posting later` edge case, exercised deliberately for the first time in any run. It arose from the tester's choice of photo rather than from the matrix, and it is the reason several findings below were reachable at all.
- The currency prefilled to `Euro` from that Spanish position, against the account's `British Pound` preference. Position-derived currency therefore correctly overrides the account default, which is the Run-4 contract reached by a new route.
- The photo position is read through `positionFromImage` in `image-upload.component.ts`, which emits the image's EXIF data. Recorded because a grep for `exif` does not find this path and an earlier reading of the same screen wrongly concluded the currency was a stale hardcoded default.
- Restaurant search returned `Toro Tapas Ronda` and `TORO TAPAS RMCR` with full Spanish addresses, and matched despite a typed typo. This is live evidence for [issue #1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245): place search works normally while the Firebase APIs are enforced, which is the reading that issue concluded must be expected rather than fixed.
- Selecting the restaurant moved the position source from `Aus Bild` to `Aus Google`, and the currency held at `Euro`.
- Save completed and returned to Home. The Bite appeared exactly once on the profile as `Test Online` at `TORO TAPAS RONDA`, `RONDA - SPANIEN`, retained its uploaded photo, and moved the profile count from 0 to 1.
- Not evidenced: the in-flight save progress state and duplicate-submit lock. The burst capture was started too early and had ended before the tap, and the save was not repeated merely to observe it. Recorded as a gap rather than claimed.
- No error, technical text, or raw translation key appeared.
- Findings filed from this session, none release-blocking: [issue #1267](https://github.com/muhammedgaygisiz/travellers-apps/issues/1267), the restaurant modal header renders as `AbbrecheRestaurant auswähl...` with the cancel action and title colliding on this screen width; [issue #1268](https://github.com/muhammedgaygisiz/travellers-apps/issues/1268), the German `Verwenden:` option breaks the app's established du-imperative voice; [issue #1266](https://github.com/muhammedgaygisiz/travellers-apps/issues/1266), the four permanent `Standort` source buttons should become a source text row with an edit modal; and [issue #1269](https://github.com/muhammedgaygisiz/travellers-apps/issues/1269), restaurant results show only the distance from the device, which cannot discriminate between candidates when the Bite position is 1539 km away.
- Result: pass for the online baseline, photo retention, foreign-position adoption, foreign currency, and enforced-mode place search.

### Session 13 - Bite Details And Currency Conversion

- Opening the new Bite started a four-step details coach-mark sequence. The inspected marks were German, understandable, and correctly targeted, including `Verstehe diesen Bite` and `Diesen Bite teilen` on the share control.
- The details page reopened with complete data: photo, title `Test Online`, three stars, `Toro Tapas Ronda`, `Ronda, Spanien`, the reaction and bookmark controls, and the map at the Bite's Spanish position.
- Currency conversion works and matches what the coach mark promises. The Bite was saved in EUR and the page displays `£4.32` in the account's preferred currency with the original `€5.00` beneath it, so neither the stored value nor the reader's currency is lost.
- Finding, filed rather than blocking: the timestamp rendered as `5 min ago` in an otherwise fully German page. [Issue #1272](https://github.com/muhammedgaygisiz/travellers-apps/issues/1272).
- Reading `time-ago.pipe.ts` for that finding exposed two further defects in the same file that are not observable on screen, and they are recorded on the same issue. `Math.abs` on the time difference makes a future timestamp render as elapsed time. More seriously, the pipe's parameter defaults to a hardcoded `2025-05-17` constant, so the `if (!value) return ''` guard never sees an absent argument and a Bite with no `createdAt` renders a confident relative age measured from an arbitrary date instead of rendering nothing.
- Result: pass for details rendering, data round trip, and currency conversion, with #1272 filed against relative time.

### Session 14 - Offline Bite Photo Failure State And Recovery

Screen mirroring drops with Airplane Mode, so the offline window was captured with on-device screenshots and transferred afterwards. Future runs should plan for this rather than discovering it at the moment the evidence matters.

- A second complete Bite was prepared with a different gallery photo, then Airplane Mode was enabled with Wi-Fi off before saving. These are the conditions that reproduced the defect on builds 90 and 91.
- Save produced a blocking progress state, `Dein Bite wird erstellt...`, which also evidences the duplicate-submit lock that Session 12 could not capture.
- The app left the create page controllably. Home showed `Bite erfolgreich erstellt!` together with the offline notice `Du scheinst offline zu sein. Bitte überprüfe deine Internetverbindung.`
- The Bite card showed a bounded pending state, `Foto wird hochgeladen - App geöffnet lassen`, and within about a minute it resolved to the terminal failed state `Foto konnte nicht hochgeladen werden` with an `Erneut hochladen` action. Both the failed state and the retry action appeared on the profile list and on the Bite details page.
- The Bite existed exactly once throughout, and the profile count moved to 2. The app stayed navigable with no endless full-page loader.
- Result: pass. [Issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) is physically verified as fixed on build 92, the first pass in three runs, and the evidence is attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229#issuecomment-5226299044). The Run-4 diagnosis is confirmed by its own repair: #1252 stopped disabling the photo while offline, so `imageStatus` is written, the upload starts, the watchdog arms, and the #1168 recovery machinery is finally reachable.
- Gap, recorded rather than passed: the automatic recovery consumed the chance to press `Erneut hochladen`, so the manual retry path is visible but unproven, and the missing-local-copy fallback is still unexercised.

### Session 15 - Foreground Reconnect After Offline Save

- Connectivity was restored with BiteTribe in the foreground on Home and without terminating the app.
- The failed photo state persisted briefly, then the upload recovered automatically without the user pressing retry, and the photo rendered in the feed. Recovery is therefore real rather than a repaint.
- The Home loading state settled, no stale location error appeared, and feed content rendered normally with the offline-created Bite present exactly once.
- No error, technical text, or raw translation key appeared.
- Result: pass. [Issue #1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230) remains fixed on build 92, and automatic photo recovery on reconnect is now evidenced as well.
- Two observations carried from the same screenshots: the offline Bite priced `CHF 5.00` and displayed `£4.64`, so the position-derived currency correctly resolved CHF for a Bern position, which narrows [issue #1262](https://github.com/muhammedgaygisiz/travellers-apps/issues/1262) further to the device-region prefill alone; and the timestamp rendered `just now` in English, already covered by [issue #1272](https://github.com/muhammedgaygisiz/travellers-apps/issues/1272).

### Session 16 - Deleted-Bite Gallery Fixture

- Because build 92 was installed over build 91, the Run-4 local gallery survived, including the photos whose Bites were deleted during Run-4 cleanup. The fixture Run 4 had to manufacture was therefore available directly, which is the practical benefit of the update install recorded in the entry state.
- Opening such a photo and using `Open Bite` produced an indefinite loading state: skeleton placeholders, empty stars, and a running progress bar, still identical after more than two minutes. No blocking not-found modal appeared, and no error text or raw technical output was shown.
- Result: fail. [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) reproduces on build 92 and has been reopened with the evidence as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232#issuecomment-5226344734).
- This confirms the entry-state suspicion recorded before execution began: the issue was closed on 7 August with no fix commit, and the relevant code is unchanged since `b3aef3ab`, the build-91 code that produced the hang. Closure state on GitHub is not evidence, which is the reason this charter re-tests reported fixes physically.
- Mechanism narrowed to two candidate paths, both ending in a permanent skeleton, recorded on the issue. `biteNotFound` matches only `BiteNotFoundError`, which is thrown at exactly one place, after a read that returns no document data. A falsy `biteId` instead takes the loader's `return undefined` path and resolves _successfully_ with no Bite, and any other error, such as a timeout from the five-attempt retry wrapper or a permission rejection, is of the wrong type for the check. Which path fired here needs a log or a debug build.
- Open question for the fix, also recorded on the issue: the local gallery contains profile photos as well as Bite photos, so `Open Bite` may be offered for images that never had a Bite at all.
- Agreed during the run and recorded as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232#issuecomment-5226353055): instrument this path with a Crashlytics non-fatal covering every branch on which the resource settles without a Bite, carrying the `biteId`, the branch taken, and the navigation origin. It separates the two candidate paths that a physical run cannot separate, and it keeps the non-deleted failure modes visible after the not-found modal exists, since a user looking at a skeleton cannot report them usefully. It follows the existing `recordException` route in `FirebaseErrorHandlerService` rather than adding a mechanism.
- Useful side effect for this charter: once instrumented, exercising this path is a reliable and harmless way to produce the Crashlytics non-fatal the monitoring section requires from each native platform, instead of depending on an incidental error such as Run 4's offline connectivity exception.
- Fixed after the run, and the mechanism turned out to be neither of the two candidate paths on its own. `ResourceRef.value()` throws a `ResourceValueError` once its resource is in an error state, and `details.container.ts` bound `[bite]="service.bite.value()"` as its first input. A failed read therefore threw during the binding update and every later input on that element, `[biteNotFound]` included, was never applied, so the page kept the skeleton it already had and could not report a state it had correctly detected. The fix routes every read through a `hasValue()`-guarded accessor, classifies a settled read with no Bite as `not-found` or `unavailable` rather than matching one error class, keeps the resource idle when the route carries no `biteId`, gives a failed read a try-again action next to the way back, and files the agreed non-fatal on every settled failure through a shared `CrashReportingService`. Still to verify on a device in the next run: the blocking not-found modal on the surviving deleted-Bite fixture, the try-again path, and the non-fatal arriving in Crashlytics.

### Session 17 - Cold Shared Bite Deep Link On Web

- Executed on desktop against production, on the real link the app's share sheet produces, `https://bite-tribe.web.app/s/bite/<biteId>`, and repeated on `https://bitetribe.app/bite/<biteId>`.
- A signed-out visitor in a fresh private window lands on `/start`. This is the intended behavior, not the defect: `RequestedUrlService` documents that the target is remembered in memory for the current page and handed back by the sign-in flow.
- Signing in from that same page, without reloading, opened the requested Bite.
- A signed-in visitor opening the share link was redirected to `/bite/<biteId>` and saw the Bite directly.
- Result: pass. [Issue #1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) is physically verified as fixed, evidence attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246#issuecomment-5226415060). Run 4's worst finding, that every shared link failed for its recipient, is resolved.
- Clarification recorded so it is not rediscovered as a false defect: the share sheet emits `/s/bite/<id>` while the fix and its e2e spec exercise `/bite/:biteId`. These are not in conflict. `firebase.json` rewrites `/s/**` to the `handleSharedLinkToBite` function, which serves an Open Graph preview page for social unfurling and redirects to `/bite/<id>`, so the e2e coverage tests the destination of that redirect. This was initially misread during the run as an unrouted share path, and the correction is kept here deliberately.

### Session 18 - Native New-Follower Push Delivery And Tap

- The Run-5 profile was made public, then followed exactly once from the established main account on desktop while BiteTribe was backgrounded.
- Exactly one push arrived, with understandable German copy: `Neuer Follower!` / `Mo folgt dir jetzt.`
- Tapping it opened BiteTribe on the **follower's profile**, the main account `Mo`, not the Home feed. This is the contract Run 4 recorded as broken.
- The landing page corroborates the trigger independently: the main account's following count read 49, one higher than the 48 recorded in Session 1 before the follow.
- Result: pass. [Issue #1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) is physically verified as fixed on build 92, evidence attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244#issuecomment-5226452160). Real APNs/FCM delivery, localization, app launch, and now target navigation all pass.
- Checked and dismissed, not a finding: Notification Centre also held an earlier BiteTribe push in Turkish, `Yeni Bite / Daniel yeni bir Bite oluşturdu`. It was delivered that morning to the main account, whose language is Turkish, so it is correct recipient-language localization per issue #1200 rather than a defect.
- Methodology limits recorded for future runs: notifications are not visible through iPhone Mirroring, and touching the physical device ends the mirroring session. Push evidence has to be captured on-device, like the Airplane Mode evidence in Session 14.

### Session 19 - Crashlytics Health, Symbols, And Build Provenance

- Crashlytics recognized the latest iOS release as `1.0.1 (92)` with one active user. Crash-free users and crash-free sessions were both 100%, and no crash issue existed for the build, so no crash occurred on a supported OS during the run.
- Non-fatals are arriving in general: one open issue, `The network connection was lost.` filed through `recordException`, with 9 events across 3 users. The trend shows events on 2 to 6 August and **none on 7 or 8 August**, so this run's deliberate offline test has not produced a non-fatal.
- The dSYM table shows seven UUIDs with status `Uploaded`, version `Unknown`, and zero events, while every `Missing (optional)` row belongs to an older build: 84, 89, 90, and the build-91 pair already recorded on [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181). No row exists for build 92, which is consistent because a UUID is only tied to a version once an event references it.
- Symbols are therefore being uploaded where build 91's were not, but this cannot be confirmed for build 92 until a build-92 event resolves them. Producing a build-92 non-fatal is the blocking step for verifying #1181, which strengthens the Session-16 proposal to instrument the details-page failure path deliberately.
- Build provenance was reconstructed in this session and is recorded in the entry state above, together with the finding that the localized iOS permission prompts are not in this artifact. Evidence attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181#issuecomment-5226495290).
- Rechecked later in the run, after further app starts: three build-92 non-fatals had arrived, the same `The network connection was lost.` exception, which is the Session-14 offline test reporting on a later start. The charter's requirement of a Crashlytics non-fatal from this native platform is therefore satisfied for iOS.
- With build-92 events present, the dSYM table resolved: two new rows appeared for `1.0.1 (92)`, both `Missing (optional)` with three events. [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) is **not fixed on build 92**.
- The decisive detail, recorded as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181#issuecomment-5226616178): the two build-92 UUIDs, `D4B24778-B39E-32D1-B6DB-8ADA39E23516` and `AD1CE4AB-6356-3948-B714-8DBA6B834959`, are the _same pair_ already listed for builds 89, 90, and 91. A dSYM UUID identifies one compiled binary and cannot repeat across four builds of changing app code, so these are unchanged prebuilt framework binaries rather than the app binary. The events frame at `FirebaseCrashlytics.swift:77`, and Crashlytics marks them optional, which both point at Firebase SDK frameworks. The seven `Uploaded` UUIDs still sit at version `Unknown` with zero events, consistent with them being the app's own dSYMs, uploaded but never referenced because nothing has yet thrown inside app code.
- This reframes the issue: `build dSYMs are missing` and `the vendor framework dSYMs are not uploaded` are different problems with different severity. A single non-fatal originating in app code would settle it, and the details-page instrumentation proposed in Session 16 would produce exactly that.
- Result: pass for crash-free health, Crashlytics recognition of the build, and non-fatal delivery from iOS. Fail for #1181, which remains open, with its framing corrected.

### Session 20 - Lifecycle And Authentication

This session was prioritized deliberately. [Issue #1249](https://github.com/muhammedgaygisiz/travellers-apps/issues/1249) rewrote `authGuard`, `startGuard`, the onboarding guards, and the store effects, which makes session and navigation handling the riskiest change in build 92. Earlier sessions exercised parts of it incidentally; this one exercises it on purpose.

- Returning from roughly thirty seconds in the background preserved a usable Home. The feed stayed rendered, with no re-entry into a loading state and no stale location error.
- A force quit followed by a cold launch restored the run5mo session, and Home settled with content.
- Logout and signing back in restored the account fully: `Bites 2`, `Follower 1` from the Session-18 push test, the public visibility set in Session 18, the display name, and the country flags for the two Bite locations, Spain and Switzerland.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS lifecycle and authentication contract on build 92. The guard rewrite behaves correctly on background return, cold start, logout, and sign-in.
- Finding, filed rather than blocking: tapping login produces no visible response for several seconds before Home appears. The login component has no pending state to render at all - its only relevant input is `loginFailed`, and the submit action carries no disabled binding while the request is in flight. Registration, in the same auth surface, binds `[loading]="pending()"`, disables submit while pending, and renders a spinner, which Session 2 recorded as a pass. Several seconds of silence on a credential submission invites the duplicate tap registration was careful to prevent. Filed as [issue #1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273). Fixed: the pending state now lives in the auth reducer, so the login page runs the header progress bar, locks the submit action behind a pending label, and locks the Google and Apple actions with it, matching registration; the sign-in effects dropped to `exhaustMap` and the email/password round-trip is bounded so the locked form always releases. See the Sign-In Feedback Contract in [[Architecture - Auth]]. Re-verify on a physical device in the next pass.

### Session 21 - Map Position, Marker, And Drawer

- The map loaded completely, centred on Bern, with clustered markers and its own coach mark, which was understandable German.
- The My Position control moved to the device's real position and rendered it as a distinct marker.
- Tapping a cluster expanded it into individual markers carrying their ratings, and selecting one opened the drawer on the correct Bite, the run's own Bern Bite.
- Expanding the drawer showed the complete card: dish, restaurant, `0.25 KM`, `BERN, SCHWEIZ`, rating, and the reaction control, with the map still visible above.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS map contract on build 92.

### Session 22 - Bite, Restaurant, And City Search

- Bite search returned both Run-5 Bites with their photos, alongside older Bites from previous runs.
- Restaurant search returned `Johny's Road Kitchen` with an understandable German note that the restaurant is not yet verified on BiteTribe.
- City search for `New York` returned Bites in that city with their restaurants and prices, so the city filter resolves against a location the device is nowhere near.
- Every loading state settled and no error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS search contract on build 92, and further evidence for [issue #1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) that place-backed search works while the Firebase APIs are enforced.
- Observation worth keeping: `Test 2` and `Test offline` from earlier runs render with placeholder icons and no photo, which is the visible residue of [issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) before its fix. Today's two Bites both carry their photos, so the same search screen shows the before and after side by side.

### Session 23 - Production Analytics Delivery

- Analytics Realtime showed one active iOS user, located in Bern, during the run.
- Events received: `user_engagement` 8, `screen_view` 3, and `notification_open` 1. Views by screen were `Home`, `My Profile`, and `User Profile`.
- The `notification_open` event and the `User Profile` view are the real push tap from Session 18 and the follower profile it landed on, so Analytics corroborates the [issue #1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) verification independently of the on-device observation rather than restating it.
- No absence or abnormal failure of iOS events was observed.
- Result: pass for iOS production Analytics Realtime delivery. As in Run 4, the build number is not an Analytics comparison dimension, and DebugView still needs a dedicated Xcode debug-mode launch, which remains unverified.

### Run 5 Outcome

- The physical iOS execution covered build identity and provenance, cold start, fresh registration, the full onboarding chain and its persistence, email verification, Bite creation online and offline, reconnect and automatic photo recovery, Bite details and currency conversion, the deleted-Bite gallery fixture, the shared deep link on web, real push delivery and tap navigation, lifecycle and authentication, map, search, Crashlytics, and production Analytics.
- **Five of the six Run-4 P0 findings are resolved.** [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) offline photo failure state and retry, physically fixed after two failed runs. [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) push tap target navigation. [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) cold shared deep link for a signed-out recipient. [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) place search under enforcement, evidenced twice. [#1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230) reconnect behavior, confirmed still fixed.
- **Release-candidate result: fail.** Two P0s remain. [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) was reopened after reproducing on build 92; it had been closed with no fix commit, which the entry state predicted before execution began. [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) is unfixed, and Run 5 corrected its framing as well as its status.
- Fourteen new issues were filed, [#1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) to [#1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273), none release-blocking, covering account identity in the menu, the profile photo pending state, device-region currency, the frozen iOS version, verification mail language and sender, the position source controls, the restaurant modal header, German voice, dual distances, profile name duplication, onboarding home location, relative timestamps, and the login pending state. [Issue #1127](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127) was physically confirmed and one premise in it corrected.
- **The run was deliberately stopped short of the full matrix.** Once #1232 reproduced and #1181 proved unverifiable, build 92 could not become the release candidate, so executing the remaining green paths would only have to be repeated on the next build. The one area executed anyway was lifecycle and authentication, because #1249 rewrote the guards and effects and a defect there would change which fixes build 93 needs. It passed.
- Deferred to the next build's run rather than executed: settings language save semantics, the in-app per-device notification switch, iOS location and notification permission recovery, Bucket Lists, the gallery viewer gesture contract, menu drafts, the privacy policy, and the destructive account deletion. The Android and web halves have not started, and the Playwright suites were not run.
- Evidence gaps recorded rather than silently passed: the refused App Check token and its retry gate still need an invalid-token artifact; Analytics DebugView needs a dedicated Xcode debug-mode launch; the `Erneut hochladen` manual retry was never pressed because recovery was automatic, so the manual path and the missing-local-copy fallback are visible but unproven; the scheduled daily ranking notification was not forced; and the localized iOS permission prompts cannot be verified on this artifact because `738901be` postdates it.

### Run 5 Cleanup Inventory

- **The disposable account was deliberately kept alive.** `muhammed.gaygisiz@bitetribe.app`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`, display name `run5mo`, is fully onboarded, email-verified, public, and followed by the main account. Retaining it lets the build-93 retest start from a real account instead of repeating registration and the seven-step assistant. It must be deleted at the end of that run, which also exercises the deletion contract deferred from this one.
- Two Bites belong to it and must be removed with it: the Session-12 online Bite `Test Online` at Toro Tapas Ronda, Spain, and the Session-14 offline Bite `Test` at Johny's Road Kitchen, Bern. Both carry uploaded photos.
- The main account gained one following edge and one follower relationship from Session 18. Its `followingCount` moved from 48 to 49 and must return to 48 when the disposable account is deleted.
- The Run-4 inventory still stands and must not be removed: the three anonymous Bites and their two Storage objects recorded under the Run-4 cleanup inventory below.
- The device app container still holds the Run-4 local gallery, which supplied this run's deleted-Bite fixture. Do not reinstall BiteTribe or clear its storage on that device until #1232 is fixed and verified.

## iOS Execution - Build 91 (Run 4)

### Entry State

- The tester reported TestFlight build 91 installed on the same physical device: `Mo's iPhone`, an iPhone 12 mini running iOS 26.5.2.
- Run 4 is a complete iOS regression pass after reported fixes for Run-3 findings #1229 through #1234; closure state on GitHub does not replace physical verification.
- The repository branch `test-run-4` was clean when execution began.
- The two anonymous Run-3 Bites remain preserved under the cleanup inventory and must not be removed during this run.
- Exact source commit, TestFlight upload timestamp, local toolchain, and signing route for build 91 remain to be recorded.
- Result: in progress.

### Session 1 - Build Identity, Session Restore, And Unauthenticated Cold Start

- TestFlight showed build 91 installed.
- Before the unauthenticated check, the app correctly restored the existing authenticated session; the tester explicitly logged out rather than treating session restoration as a startup defect.
- After logout and a complete termination/relaunch, BiteTribe opened the unauthenticated Start screen.
- The Start screen has no page-level loading state, so loader settlement was not applicable. A subsequent authenticated login had already shown normal bounded loading behavior.
- No error, technical text, or raw translation key appeared.
- Result: pass for build identity, authenticated session restoration, logout persistence, and unauthenticated cold start.

### Session 2 - Fresh Registration Gate

- A new disposable email/password registration form opened correctly.
- One submit immediately produced visible progress and locked duplicate submission.
- Registration completed within 60 seconds and opened the mandatory onboarding assistant.
- Exactly one matching new user existed in production Firebase Authentication.
- No error or raw translation key appeared.
- Result: pass; Run 4 continues to the full onboarding and regression matrix.

### Session 3 - Onboarding Identity

- The identity explanation rendered in the expected language and was understandable.
- A unique test profile name was accepted.
- A profile photo could be selected from the existing iOS media-library permission and rendered correctly in the preview.
- Continuing opened Profile visibility.
- No error, technical text, or raw translation key appeared.
- Result: pass.

### Session 4 - Onboarding Profile Visibility

- The public/private explanation was understandable and the selected state was visually unambiguous.
- Tapping the whole row selected Private, and the resulting Private state was clear.
- Continuing opened Currency.
- No error, technical text, or raw translation key appeared.
- Result: pass; Private persistence remains to be checked on the completed profile.

### Session 5 - Onboarding Currency

- The favorite/preferred-currency explanation was understandable.
- Tapping the whole GBP row selected it as a favorite, and the favorite state was clear.
- GBP could be set as the preferred currency with an unambiguous selected state.
- Continuing opened Language.
- No error, technical text, or raw translation key appeared.
- Result: pass; GBP persistence remains to be checked after onboarding.

### Session 6 - Onboarding Language

- English was preselected and the initial selected state was unambiguous.
- Tapping the whole German row changed the selection clearly to German.
- Continuing showed a visible, understandable loading state without a raw translation key.
- The next Standort step rendered fully in German.
- No error or technical text appeared.
- Result: pass for an actual onboarding language transition.

### Session 7 - Onboarding Location

- The Standort explanation was fully German, understandable, and made the activation action clear.
- The activation action responded immediately and produced an unambiguous Standort-activated state.
- Continuing opened Benachrichtigungen.
- No new iOS permission dialog was expected because the app-level permission survived the installed-app update.
- No error, technical text, or raw translation key appeared.
- Result: pass.

### Session 8 - Onboarding Notifications

- The German notification explanation was understandable.
- The page correctly recognized and clearly displayed the already-active app-level iOS notification permission retained by the installed app.
- No contradictory activation prompt appeared, and continuing opened Fertig.
- No error, technical text, or raw translation key appeared.
- Result: pass for onboarding state recognition; push-token ownership and delivery to the new account remain to be tested end to end.

### Session 9 - Onboarding Completion And Coach Marks

- The Fertig page rendered fully in German with understandable copy.
- Completion opened Home without a hang and automatically started the coach-mark sequence.
- Every coach mark was visible, targeted the correct UI element, used understandable copy, navigated correctly, and the final step closed the sequence.
- No error, technical text, or raw translation key appeared.
- Result: pass.

### Session 10 - Onboarding Persistence

- The completed profile displayed Private.
- Settings persisted German, GBP as a favorite, GBP as the preferred currency, and active current-device notifications.
- The email-verification reminder was visible for the new unverified account.
- No error, technical text, or raw translation key appeared.
- Result: pass for persistence of all inspected onboarding choices.

### Session 11 - Email Verification

- Resend immediately showed a sending state, disabled duplicate action, and ended with a clear success confirmation.
- Exactly one new message arrived from an expected BiteTribe sender.
- The newest verification link completed successfully on desktop.
- Reactivating the iPhone synchronized the verified state and removed the reminder without an app restart.
- No error, technical text, or raw translation key appeared.
- Result: pass for the full verification journey.

### Session 12 - Privacy And Account-Deletion Entry Points

- The Privacy Policy was discoverable from About; its heading and inspected sections rendered fully in German without unexpected English copy or a fallback notice.
- Back navigation returned correctly.
- Delete Account was discoverable in Settings, but the destructive flow was intentionally deferred until the end of Run 4.
- No error, technical text, or raw translation key appeared.
- Result: pass for legal copy and both entry points.

### Session 13 - Settings Language And Save Semantics

- The general settings area was visually separated from current-device notifications, and its action was explicitly labelled `Einstellungen speichern`.
- Selecting English did not change the UI prematurely; saving changed the interface fully to English without a raw key or technical text.
- Selecting and saving German restored German, which persisted after leaving and reopening Settings.
- No error appeared.
- Result: pass.

### Session 14 - In-App Current-Device Notifications

- The current-device notification switch disabled immediately without using the general Settings save action and remained disabled after reopening.
- Re-enabling also applied immediately and remained active after reopening.
- No error, technical text, or raw translation key appeared.
- Result: pass; the switch was left active for delivery testing.

### Session 15 - iOS Notification Permission Recovery

- Disabling Allow Notifications in iOS Settings was recognized by BiteTribe, produced an understandable blocked-state explanation, and exposed an action that opened the correct BiteTribe Settings page.
- After re-enabling the iOS permission, BiteTribe did not update immediately on direct return; navigating away from and back to the page refreshed the state.
- After that page transition, the old blocked hint cleared, the active state was unambiguous, and no app restart was required.
- No error, technical text, or raw translation key appeared.
- Result: pass with page-transition refresh behavior explicitly recorded.

### Session 16 - iOS Location Permission Recovery

- After changing location access to Never, BiteTribe did not recognize the denial immediately on return; a Home pull-to-refresh exposed the understandable denial state and app-specific recovery action.
- The recovery action opened the correct BiteTribe page in iOS Settings.
- Restoring While Using the App was recognized immediately on direct return without another refresh or restart.
- The old location error cleared, Home loaded normally with a bounded loading state, and no technical error or raw translation key appeared.
- Result: pass with initial denial detection requiring Home pull-to-refresh.

### Session 17 - Online Bite Photo And Foreign Currency

- A new gallery photo was selected and previewed correctly.
- Restaurant/Places search selected a Euro-area restaurant successfully.
- EUR was set directly from the selected place despite the account's preferred GBP currency.
- Save immediately showed progress, prevented duplicate submission, and completed within 60 seconds.
- The Bite appeared exactly once, retained its uploaded photo, and reopened with complete data.
- No error, technical text, or raw translation key appeared.
- Result: pass for the online baseline and foreign-location currency behavior.

### Session 18 - Offline Bite Photo Failure State

- A second complete Bite with a different gallery photo was saved exactly once after Airplane Mode was enabled and Wi-Fi disabled.
- The app left the create page controllably, kept the Bite exactly once, and remained navigable without an endless full-page loader.
- The selected photo was not displayed or otherwise represented as retained for recovery.
- No visible pending state, localized failed-photo state, or Retry action appeared within 60 seconds or afterwards.
- No technical text or raw translation key appeared.
- Result: fail. Build 91 physically reproduces issue #1229 despite the reported thirty-second timeout fix; retained-copy retry and missing-copy fallback remain unreachable from the UI.

### Session 19 - Foreground Reconnect After Offline Save

- Connectivity was restored in the foreground without terminating BiteTribe.
- The Home loading state settled within 60 seconds; no stale location error appeared.
- Feed content rendered normally and navigation remained usable throughout and afterwards.
- Profile contained both Run-4 Bites, with the offline-created Bite exactly once.
- Returning to Home did not re-enter an endless loader, and no technical text or raw translation key appeared.
- Result: pass for issue #1230 on build 91. The missing photo state remains independently failed under #1229.

### Session 20 - First Inline Bucket List Creation

- On the fresh account with zero lists, the successful online Bite showed a clear empty add-to-Bucket-List state and offered inline creation.
- Creating the first list reported success only after it completed; the list appeared under My Bucket Lists and persisted after reopening.
- The current Bite was added exactly once, displayed its membership, and produced neither a duplicate list nor duplicate membership.
- No error, technical text, or raw translation key appeared.
- Result: pass for issue #1231's repaired first-list create-and-add path on build 91. The direct My Bucket Lists control path remains to be checked.

### Session 21 - Bucket List Control Paths

- Creating a second list directly under My Bucket Lists persisted after reopening.
- Adding the offline Bite to that existing list produced exactly one membership with a clear selected state.
- Swipe to tried, Undo, and persistence of the restored state all worked on the online Bite.
- Opening the online Bite from the first list and returning both navigated correctly.
- No error, technical text, or raw translation key appeared.
- Result: pass; issue #1231 and the wider Bucket List regression contract are physically verified on build 91.

### Session 22 - Local Gallery Viewer And Gestures

- The successful online Bite photo was visible in the local gallery; tapping the tile gave immediate response and opened the correct image in the full-screen viewer.
- The multi-image position counter, pinch zoom, pan while zoomed, double-tap zoom, and horizontal paging all worked without unusable gesture conflict.
- The top-right close action returned to the same gallery scroll position.
- No error, technical text, or raw translation key appeared.
- Result: pass for issue #1232's gallery viewer and physical gesture contract. Open-Bite navigation and details-page viewer remain to be checked.

### Session 23 - Gallery Bite Navigation And Details Viewer

- Reopening the online photo exposed Open Bite and navigated to the correct Bite.
- Back returned to the gallery at the same scroll position with the viewer closed.
- Tapping the dish image on the normal Bite details page opened the same full-screen viewer; zoom and close worked, and no redundant Open Bite action appeared there.
- No error, technical text, or raw translation key appeared.
- Result: pass for all reachable issue #1232 paths on build 91. The blocking not-found modal for an already-deleted Bite remains unverified because this run has no safe deleted-Bite local-gallery fixture.

### Session 24 - Cancelled Menu Draft Then Generic Create

- A Restaurant with a menu loaded successfully, and Create Bite on a menu item opened the form with the correct Restaurant and dish prefilled.
- Cancelling through back navigation without saving returned controllably to the prior journey and then to Home.
- Starting the normal Create Bite flow from Home afterwards produced a clean form: neither the cancelled Restaurant nor the cancelled dish was present, and only intentional global defaults remained.
- No error, technical text, or raw translation key appeared.
- Result: pass for issue #1233's cancel-then-generic-create path on build 91. Cancel-then-another-menu-item, background/route reuse, and a successful menu-derived save remain to be checked.

### Session 25 - Alternate Menu Draft, Background, And Successful Save

- A different menu item opened Create Bite with the correct Restaurant and new dish; no data from the previously cancelled item leaked into the form.
- Backgrounding BiteTribe for approximately thirty seconds and returning preserved the current creation session correctly without resurrecting the cancelled draft.
- Completing and saving the menu-derived Bite succeeded exactly once, and reopening it preserved the intended Restaurant and dish.
- A later generic Create Bite action from Home was clean again and contained no Restaurant or dish from either menu flow.
- No error, technical text, or raw translation key appeared.
- Result: pass; all physical acceptance paths for issue #1233 are verified on TestFlight build 91.

### Session 26 - Map Position, Marker, And Camera

- The map loaded completely and My Position moved to the current device position correctly.
- A marker for a successfully saved Bite was visible and exposed the correct Bite in the map drawer.
- Opening that Bite and returning to the map both navigated correctly.
- Manual pan and zoom worked without an unexpected camera jump.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS map regression contract on build 91.

### Session 27 - Bite, Restaurant, And City Search

- Searching for a saved Bite returned the expected result; opening it and returning both navigated correctly.
- Restaurant search returned and opened the expected Restaurant, with correct back navigation.
- City search returned and opened the expected location result, with correct back navigation.
- Every loading state settled normally, and no error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS search regression contract on build 91.

### Session 28 - Cold External Bite Deep Link

- Sharing a successfully saved Bite produced a `/bite/` link that could be opened from outside BiteTribe after the app was fully terminated.
- The link cold-launched the native app, preserved the authenticated session, and opened the correct Bite.
- Back navigation remained controlled, all loading settled, and no error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS cold deep-link contract on build 91.

### Session 29 - Lifecycle, Logout, And Login

- Returning from approximately thirty seconds in the background preserved a usable Home state.
- A normal cold launch restored the authenticated session; Home settled without an endless loader, and the profile, all three Run-4 Bites exactly once, and the Bucket Lists remained complete.
- Logout reached Start, and Start persisted across a full termination and relaunch.
- Signing back into the same Run-4 account restored Home and all expected profile, Bite, and Bucket List data.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS lifecycle and authentication regression contract on build 91.

### Session 30 - Native New-Follower Push Delivery And Tap

- The Run-4 test profile was made public and remained discoverable from the established desktop account.
- Following it exactly once while BiteTribe was backgrounded and the iPhone locked produced exactly one push within 60 seconds.
- The notification copy was understandable German, and tapping it opened BiteTribe without an error or technical text.
- The tap landed on the Home feed instead of the new follower's profile, contrary to the notification navigation contract and the supplied `followerUid` payload.
- Result: fail for target navigation under [issue #1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244); real APNs/FCM delivery, localization, and app launch pass.

### Session 31 - App Check Enforced Working Session

- Firebase Console showed `Enforced` for Storage, Cloud Firestore, and Authentication after the Build-91 physical run.
- The seven-day overview reported Storage at 98% verified and 2% unverified, Cloud Firestore at 100% verified and 0% unverified, and Authentication at 96% verified and 4% unverified; the tester observed no conspicuous invalid or unknown-request increase during Run 4.
- Build 91 completed extensive authenticated reads and writes while those Firebase APIs were enforced, including registration, settings, Bite creation, social activity, and push-token use. This is behavioral evidence, and therefore an inference, that the distributed TestFlight artifact supplied accepted App Check tokens.
- Places API (New) remained in Monitoring at 0% verified and 100% unverified; [issue #1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) records this separate protection gap rather than silently treating Places as covered.
- Resolved after the run by [[issue-1245]], and the reading was the finding: BiteTribe reaches Places only server-to-server from Cloud Functions, Google Maps Platform App Check only accepts tokens from the client Maps and Places SDKs, so 0% verified is what this architecture must report and enforcement would break every place search. The equivalent control is the callable in front of Places - App Check enforced plus an authenticated caller - now pinned by build-failing specs. The next run reads Places as expected-unverified and records that place search works while the Firebase APIs stay enforced.
- Result: pass for the Firebase iOS enforced working-session path, but fail for verified Places traffic under #1245. The aggregates are not build-specific, and the deliberately refused-token startup/retry gate still requires a separate invalid-token artifact or controlled environment.

### Session 32 - Crashlytics Delivery And Symbols

- Crashlytics recognized the latest iOS release as 1.0.1 (91); crash-free users and crash-free sessions were both 100%, with no crash issue for the build.
- One non-fatal event from one user arrived for build 91 on 6 August 2026. It was the expected background connectivity error from the deliberate offline test: `Failed to get document because the client is offline` on the Run-4 iPhone 12 mini / iOS 26.5.2.
- This artifact-specific event verifies production Crashlytics delivery from the TestFlight build.
- Crashlytics nevertheless reported build-91 UUIDs `AD1CE4AB-6356-3948-B714-8DBA6B834959` and `D4B24778-B39E-32D1-B6DB-8ADA39E23516` as `Missing (optional)`, each associated with one event. The evidence is attached to [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181), which must retain and upload symbols for the exact native artifact.
- Result: pass for Crashlytics event delivery and crash-free health; native symbol retention/upload remains a P0 release-pipeline gap under #1181.

### Session 33 - Production Analytics Delivery

- Analytics Realtime showed an active iOS user for app version 1.0.1 after fresh activity on Build 91.
- The filtered comparison received `screen_view`, `user_engagement`, `notification_open`, and `bite_viewed`, covering normal navigation, engagement, the real push tap, and Bite interaction from the physical run.
- No complete absence or abnormal failure of iOS events was observed.
- The processed `Latest app release overview` card remained empty even after the report range was changed to include 6 August. Because Realtime already proves current production delivery and standard reports are delayed, this is recorded as a dashboard evidence gap to recheck after processing rather than as a current app defect.
- Result: pass for iOS production Analytics Realtime delivery. Build number 91 is not an Analytics comparison dimension; DebugView and the processed release-overview card remain unverified.

### Session 34 - Target-Account Identity Before Deletion

- The deletion page showed the disposable account's photo, display name, e-mail address, and sign-in method, which is the identity surface [issue #1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234) reported missing in Run 3.
- The final confirmation and the password dialog each repeated the identity in a reduced form, display name and e-mail only, without the photo and sign-in method. Both still name the exact account being destroyed, so the tester accepted this as sufficient rather than a defect.
- Every step showed the Run-4 disposable account. The main account never appeared at any point in the flow.
- Result: pass for the #1234 identity contract on Build 91; the reduced repetition on the confirmation and password steps is recorded as an observation, not a finding.

### Session 34 - Pre-Deletion Firebase Snapshot

- Captured from the Firebase Console immediately before the destructive run so each removal can be proven against a recorded prior state rather than asserted from a later absence.
- Disposable account `rd6fEZTWcxbzoIgM65QQxPUqSYH2` and main account `3HaVavOKbzRuNjg6p2ceUAH0pgh2` both existed in Authentication and were unambiguously distinct.
- `/users/rd6f…` carried `displayName` and `normalizedDisplayName` both set to `momo`, and `/displayNames/momo` claimed the name for that UID.
- `/settings/rd6f…` existed. `/users/rd6f…/pushTokens` held one token, matching the single test device.
- `/users/rd6f…/followers` held exactly one edge, the main account, from Session 30. `/users/rd6f…/following` was empty. The counter-edge `/users/3HaV…/following/rd6f…` existed, and the main account's `followingCount` was 49.
- Two Bucket Lists belonged to the account: `4TZII7JRADpjSmLIQy49` and `8bciVEiqufkrstJ5GnFX`.
- Neither `/meta/leaderboard` nor `/meta/leaderboardDaily` contained the account. This is expected rather than a gap: both snapshots keep only the top `LEADERBOARD_LIMIT` of 10 public users, and three Bites do not reach that cut. The deletion cascade therefore has no leaderboard entry to remove, so this run cannot evidence that branch of the contract.
- Storage held the profile image `images/users/rd6fEZTWcxbzoIgM65QQxPUqSYH2/8d8fec8c-c799-4b59-a641-d7fa67162798.jpg`. It sits inside the UID folder, so the cascade's `images/users/{uid}/` prefix delete does apply to it.
- Both Bite image folders were present with one file each and are expected to survive the deletion.
- `/accountDeletions/rd6f…` did not exist yet, so any job document found afterwards belongs to this run.

### Session 34 - Disposable-Account Deletion Execution

- The deletion ran on the physical device with password reauthentication. The password dialog stayed on screen after submission with only its input field cleared, while a loading state was visible behind it; the app then returned to the start screen on its own after roughly 30 seconds with no error text or raw technical output.
- `/accountDeletions/rd6fEZTWcxbzoIgM65QQxPUqSYH2` reported `status: completed`, started at `2026-08-06T17:28:49.867Z` and finished at `2026-08-06T17:28:59.393Z`. Server-side execution therefore took 9.5 seconds, far inside the two-minute expectation.
- The persisted counters matched the pre-deletion snapshot exactly: `anonymizedBites` 3, `deletedBucketlists` 2, `deletedFollowEdges` 2 for the single follower's edge and counter-edge, `deletedPushTokens` 1, and zero for likes, reviews, ratings, and BiteTrail sales, which the disposable account never produced.
- Result: pass. The reduced identity repetition and the password dialog that stays open during the cascade are recorded as observations; neither blocked the flow, and neither reaches the P0 bar this charter requires for a filed finding.

### Session 34 - Deletion Contract Verification

- Authentication: the disposable account was gone and the main account `3HaVavOKbzRuNjg6p2ceUAH0pgh2` remained untouched.
- Removed as required: `/users/rd6f…`, `/settings/rd6f…`, and the `/displayNames/momo` reservation, which releases the name for reuse.
- Social graph: the counter-edge `/users/3HaV…/following/rd6f…` was gone and the main account's `followingCount` moved from 49 to 48, so the follow trigger corrected the surviving user's aggregate.
- Both Bucket Lists `4TZII7JRADpjSmLIQy49` and `8bciVEiqufkrstJ5GnFX` were deleted.
- All three Bites survived with the `userId` field removed rather than emptied, matching the anonymization contract that keeps shared content reachable for other users' Bucket Lists and BiteTrails.
- Storage: the profile image `images/users/rd6f…/8d8fec8c-c799-4b59-a641-d7fa67162798.jpg` was deleted, and both Bite images were intentionally retained for the later authorized cleanup.
- Leaderboard removal could not be evidenced in this run because the account never entered the persisted top 10; this branch of the cascade remains unverified rather than passed.
- Result: pass for the account-deletion contract on Build 91. [Issue #1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234) stays closed, now backed by physical verification instead of a reported fix.

### Session 35 - Cold Bite Deep Link On Web

- Found after the deletion while resolving which local gallery photo belonged to which Bite, not as a planned charter step.
- A cold external `https://www.bitetribe.app/bite/<biteId>` never opens the Bite. Signed out it ends on `/start`, reproduced directly against production; signed in it ends on the Home feed, observed on the tester's desktop for two different Bites.
- Mechanism: on a cold load `authState()` is still `null`, `authGuard` waits on `authStateChange$` behind a fixed `debounceTime(2000)` and returns `/start` when that elapses, and `startGuard` then forwards an authenticated user to `/home`. The requested URL is discarded in both directions and never restored after sign-in.
- Independent of the anonymization and of #1229: a normal Bite carrying a `userId` behaves the same, and the equivalent cold external deep link passed on iOS in Session 28.
- Filed as P0 [issue #1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) in the Bite Tribe project, cross-referenced from [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) as a probable shared root cause: both lose a deep target requested while auth state is unrestored on a cold start.
- Result: fail. Bite sharing is the product's only share surface, so every shared link currently fails for its recipient.

### Session 36 - Deleted-Bite Gallery Fixture

- Deleting two Run-4 Bites while their local photo copies stayed on the device created the deleted-Bite local-gallery fixture that Session 22 lacked, which closes the last unverified acceptance criterion of [issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232).
- Opening such an image with "Open Bite" produces an indefinite loading state on the details page. No blocking not-found modal appears, and there is no error text or raw technical output.
- `biteIdFromImageName` deliberately performs no existence check and leaves the missing-Bite case to the details page, which is the correct split; the details page is the part that neither resolves nor reports.
- Result: fail. #1232 was reopened with this evidence and already carried P0. A useful side effect for other reports: an indefinite loading details page is the observable signature of a Bite that cannot be found.

### Run 4 Outcome

- The physical iOS execution covered build identity and cold start, fresh registration, the full onboarding chain, permissions and their recovery paths, settings and localization, email verification, Bite creation online and offline, reconnect behavior, Bucket Lists, the local gallery, menu drafts, map, search, deep links, lifecycle and authentication, real push delivery, App Check, Crashlytics, production Analytics, and the destructive account deletion.
- Four Run-3 findings verified as fixed on Build 91: #1230 reconnect feed deadlock, #1231 first inline Bucket List creation, #1233 cancelled menu draft leakage, and #1234 missing target-account identity before deletion. #1232 passed its gallery interaction contract but was reopened after cleanup exposed the deleted-Bite case, see Session 36.
- Release-candidate result: fail. Six P0 findings remain open: [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) offline photo recovery, still reproducible after a reported fix; [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) push tap opening Home instead of the follower profile; [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) Places API traffic fully unverified under App Check; [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) missing build-91 dSYMs in the native pipeline; [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) cold Bite deep links never opening the Bite on web; and the reopened [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) for the missing deleted-Bite not-found modal.
- Evidence gaps recorded rather than silently passed: the refused App Check token and retry gate still needs an invalid-token artifact or controlled environment; Analytics DebugView needs a dedicated Xcode debug-mode launch; the processed `Latest app release overview` card was still empty and must be rechecked after processing; the scheduled daily ranking notification was not forced; the leaderboard branch of the deletion cascade was not exercised; and build 91's exact source SHA, local toolchain, signing route, and TestFlight upload timestamp are still unrecorded.

### Run 4 Cleanup Inventory

- Captured before the destructive Session-34 deletion so the Run-4 artifacts stay identifiable after anonymization. Run 3 lost that mapping; this inventory exists to prevent a repeat.
- The three documents below are anonymous as of 6 August 2026. Their former owner, the disposable account `rd6fEZTWcxbzoIgM65QQxPUqSYH2`, no longer exists, so the names and image paths recorded here are the only way to identify them.
- `/bites/46aaf056-d171-44ca-af28-e81ee97abf3b` has no image and is the Session-18 offline Bite. It is the live Build-91 evidence for [issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) and survived the deletion as an anonymized document, as required.
- That document was read before cleanup and narrows #1229 to a different layer than the reported fix touched. It was created at `2026-08-06T15:35:07.893Z` with `imageStatus` absent, `imagePath` an empty string, and `addressStatus` `resolved`. The absent `image` field proves nothing, because `submitNewBite` always destructures `image` out before writing; the absent `imageStatus` is the decisive part, since that field is only written when `image` is truthy at submit. The photo was therefore already gone when the Bite was saved, so no upload started, the 30-second stall watchdog was never armed, no terminal `failed` was written, and the Retry action could not appear. The #1168 recovery machinery was never reached and is not the broken part. `addressStatus` reaching `resolved` shows queued offline writes on this document did flush after reconnect, so a `failed` write would have landed had one been issued. Evidence attached as [issue #1229 comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229#issuecomment-5207973315).
- The device-local retained copy that `findLocalImage` would return is the other half of this evidence and still exists only on the Run-4 iPhone. Do not reinstall BiteTribe or clear its storage on that device until #1229 is diagnosed; the account deletion does not affect the app container.
- **Run 5 entry prerequisite.** This conflicts with starting the next run from a clean install. Download the app container in Xcode and archive `AppData/Documents` **before** Run 5 begins, or Run 5's fresh install destroys the only copy of this evidence.
- The in-app local gallery lists `Directory.Documents` by the `bites_<docId>` naming and shows three images. One of them reached a details page that never finished loading, and the tester identified its photo as the offline Bite's, which briefly looked like a contradiction of the analysis above. It is not. Two later observations settled it: a deleted Bite opened from the gallery produces the same indefinite hang, so an indefinite hang is the signature of a Bite that cannot be found; and `46aaf056` itself renders normally when opened through in-app search, bypassing the gallery. The hanging image therefore does not belong to `46aaf056`, the offline Bite has no local copy, and the analysis above stands.
- What replaces the contradiction is a stronger lead: a local photo copy exists on the device for a Bite id that has no Firestore document. `writeBlobToFileSystem` runs only inside the upload path, so an upload was started for that id, yet no document for it exists - while the document that does exist for the offline save carries no image. The decisive step is to read `AppData/Documents` from the app container in Xcode and look up the third file's id in Firestore. Recorded on [issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229#issuecomment-5208318794).
- The desktop deep-link observation from the same investigation proved nothing about this Bite: cold Bite deep links fail on the web for every Bite, which is #1246.
- `/bites/15f0612d-7846-4310-b82a-c30dada12ba2` is the Session-25 menu Bite, identifiable by the pre-seeded menu-item name `Salami`, and carries image `images/bites/15f0612d-7846-4310-b82a-c30dada12ba2/916d7a2f-c6a6-4980-8dd8-8ba547e51b58.jpg`.
- `/bites/c9bf32d1-02a9-453d-ba28-29c4961a3dc4` is the Session-17 online Bite, named `Test`, and carries image `images/bites/c9bf32d1-02a9-453d-ba28-29c4961a3dc4/0df1c577-4019-42c8-a8eb-98d7d2ee895b.jpg`.
- Both Storage objects were confirmed present after the deletion. The contract keeps Bite images for a later controlled cleanup and removes only the profile picture, which is gone.
- Cleanup of these three documents and their two Storage objects is deferred to the end of the iOS fix-and-retest loop and requires explicit authorization, exactly like the Run-3 inventory.

## iOS Execution - Build 90 (Run 3)

### Entry State

- The tester reported TestFlight build 90 installed on the same physical device: `Mo's iPhone`, an iPhone 12 mini running iOS 26.5.2.
- Issue [#1219](https://github.com/muhammedgaygisiz/travellers-apps/issues/1219) is closed after the build-89 registration blocker was fixed.
- Run 3 starts with a fresh email/password registration as the resume gate. The run must not continue to the deferred matrix unless registration reaches onboarding and the corresponding Firebase Auth user exists.
- Exact source commit, TestFlight upload timestamp, local toolchain, and signing route for build 90 remain to be recorded.
- Result: in progress.

### Session 1 - Fresh Registration Resume Gate

- The unauthenticated Start screen opened without error after a force quit.
- Registration progress and duplicate-submit locking appeared immediately.
- A fresh email/password registration completed within 60 seconds.
- Exactly one corresponding user was present in production Firebase Auth.
- The app opened the blocking onboarding assistant.
- No error or raw translation key appeared.
- Result: pass. Issue #1219 is physically verified as fixed in build 90, so Run 3 continues.

### Session 2 - Onboarding Through Location

- Identity: expected-language copy, test name entry, media-library profile photo selection, preview, and the transition to Profile visibility all passed without an error or raw key.
- Profile visibility: the explanation and selected state were clear; Private was selected and the transition to Currency passed. Persistence remains to be checked on the normal profile after onboarding.
- Currency: GBP was selected by tapping the whole row, the selected state was clear, and the transition to Language passed. Persistence remains to be checked after onboarding.
- Language: German was selected; the loading transition contained readable copy, no raw key appeared, and the next Standort step rendered fully in German. Result: the original onboarding scenario from issue #1186 passes on build 90.
- Standort: the step did not display a coordinate or place. Activating the in-app action did not open iOS Settings; it changed the step to an explicit Standort aktiviert state, produced no error, and allowed the transition to Benachrichtigungen. This granted/onboarding path passes and is distinct from the OS-denied recovery behavior tracked by issue #1183.
- Result: pass through the Standort step.

### Session 3 - Notifications, Completion, Coach Marks, And Persistence

- The Benachrichtigungen explanation was understandable, activation was enabled, the active state was clear, and the transition to Fertig passed without an error or raw key.
- Finishing onboarding opened the Home feed and displayed the expected first-run coach marks.
- Every coach mark was visible, targeted the correct UI element, used understandable German copy, navigated correctly, and closed at the end without an error or raw key.
- The normal profile displayed Private, confirming persistence of the onboarding visibility choice.
- Settings retained German, GBP, and current-device notifications enabled.
- The email-verification reminder was visible for the fresh unverified account.
- Result: pass. The onboarding scenarios from issues #1184, #1186, #1187, and #1188 are physically verified in build 90; notification delivery remains separate.

### Session 4 - Verification Resend And Completion

- Resend immediately showed a sending state, disabled the action while in flight, and displayed a clear success confirmation.
- One additional verification message arrived from `muhammed.gaygisiz@bitetribe.app`.
- The newest link was opened and completed on a desktop.
- When the iPhone was activated again, BiteTribe synchronized the verified state and removed the reminder without an app restart.
- No error or raw translation key appeared.
- Result: pass for issue #1189 and the end-to-end email-verification journey.

### Session 5 - German Privacy Policy

- From the German app session, the Privacy Policy heading and inspected body sections rendered in German.
- No unexpected English content or fallback-language notice appeared.
- Returning to BiteTribe worked without an error or raw translation key.
- Result: pass for issue #1218 on a physical iOS device.

### Session 6 - Notification Settings Save Action

- The button is explicitly labelled `Einstellungen speichern` and belongs to the general settings area.
- Spacing visually separates that general settings/save area from the current-device notification control, whose changes apply immediately.
- The tester found the distinction understandable and considered the original ambiguity resolved.
- Disabling and re-enabling current-device notifications each persisted after reopening the page.
- No error or raw translation key appeared.
- Result: pass for push-setting persistence and issue #1217; the existing closed issue state is correct.

### Session 7 - iOS Location Denial Recovery

- Setting BiteTribe location access to Never produced a readable denial message.
- The app-specific action labelled `Der Standortzugriff für BiteTribe` opened the correct BiteTribe page in iOS Settings.
- After restoring While Using the App and returning directly, BiteTribe recognized the location automatically.
- No manual refresh was required, the old error cleared after successful recovery, and no raw key or technical error appeared.
- Result: pass for issue #1183; the existing closed issue state is physically verified as correct on build 90.

### Session 8 - Successful Bite Photo Upload And Foreign Currency

- A gallery photo was selected and previewed successfully.
- `Toro Tapas Ronda` was selected through the restaurant/place search.
- The form inferred EUR from the selected restaurant despite the account's GBP default, covering an explicit foreign-place currency case.
- Saving completed without a hang; the uploaded photo remained visible and the Bite was complete after reopening.
- No error or raw translation key appeared.
- Result: pass for successful photo upload, persistence, place selection, and location-derived currency.

### Session 9 - Offline Photo Upload Failure State

- A second Bite was fully prepared with a different gallery photo; Airplane Mode was enabled and Wi-Fi disabled immediately before Save.
- Save left the create page and a local Bite entry remained visible after 60 seconds offline.
- The selected photo disappeared, no explicit failed-photo state or readable error appeared, and no retry action was available.
- The app remained otherwise interactive.
- Result: fail. [Issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) tracks the missing bounded failure state, retained-local-copy representation, and retry path.

### Session 10 - Reconnect After Offline Bite Save

- After Airplane Mode was disabled and Wi-Fi restored, the Home feed entered a full-page loading state and displayed a location error.
- The loader did not settle after more than 60 seconds; no delayed photo failure state or retry appeared.
- Navigation remained usable. Profile showed both test Bites, including the offline-created Bite with its image missing.
- Returning to Home reproduced the same indefinite loading state.
- A force quit and online restart recovered Home and cleared the location error; both Bites appeared exactly once and the app was usable again.
- The offline-created Bite still had no photo, failed state, or retry after restart, so issue #1229 persists independently.
- Result: fail. [Issue #1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230) tracks bounded reconnect synchronization, feed availability, and the interacting location-error state.

### Session 11 - First Bucket List Creation From A Bite

- With no lists on the fresh account, the Bite add dialog showed a correct empty-state explanation and offered list creation.
- Creating the first list from that inline flow showed success but persisted no list, added no membership state to the Bite, and showed no error.
- Control path: creating `Run 3 Test` directly under My Bucket Lists persisted correctly; it then appeared in the Bite add dialog, the Bite was added, and membership displayed correctly.
- Result: fail for the inline create-and-add path, tracked by [issue #1231](https://github.com/muhammedgaygisiz/travellers-apps/issues/1231); direct list creation and subsequent add pass.

### Session 12 - Map, Search, Bucket List, Gallery, And Restaurant

- Map loaded, My Position worked, the successful Bite marker and drawer were correct, Bite navigation/back passed, and pan/zoom caused no unexpected camera jump.
- Bite, restaurant, and city searches each returned and opened the expected result; back navigation and loading states passed.
- With the directly created list, swipe to tried, undo, persistence after reopening, and opening the Bite from the list all passed.
- Local gallery loaded and contained the successful uploaded photo, but tapping the image produced no visible response and opened neither a viewer nor the Bite. [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) tracks the silent interaction.
- The initially selected Restaurant was reachable from the Bite and back navigation passed. It had no menu, so a separate searchable Restaurant was used for the menu journey recorded below.
- No raw translation key or technical error appeared.

### Session 13 - Bite Deep Link And Restaurant Menu Journey

- Sharing the successful Bite produced a `/bite/` link; opening it outside BiteTribe launched the native app, opened the correct Bite, and allowed correct back navigation.
- A Restaurant with a menu was found through search and the menu loaded successfully.
- Individual menu-item detail pages are not part of the specified product flow. The supported action is Create Bite from a menu item.
- Create Bite was present, opened the form with the correct Restaurant and dish/menu item prefilled, and could be cancelled with correct back navigation.
- After returning to Home, a later generic Create Bite action still contained the cancelled Restaurant and menu-item data. [Issue #1233](https://github.com/muhammedgaygisiz/travellers-apps/issues/1233) tracks this transient draft state leaking into a new creation session.
- No error or raw translation key appeared.
- Result: Bite deep linking and initial menu prefill pass; cancellation cleanup fails under issue #1233.

### Session 14 - Lifecycle, Authentication, And Notification Permission Recovery

- Returning after 30 seconds in the background preserved a usable state without a hang.
- Force quit/restart restored the authenticated session, loaded Home, showed both test Bites exactly once, and produced no location error, endless loader, or raw key.
- Logout reached the unauthenticated Start screen; login completed without a hang and restored Home, profile, both Bites, and the Bucket List.
- With iOS Allow Notifications disabled, BiteTribe recognized and explained the OS-blocked state and opened the correct app Settings page.
- After re-enabling notifications, the in-app manual refresh recognized the active state and cleared the old hint without a force quit or restart.
- Result: pass for lifecycle/session restoration, logout/login, and issue #1184's current-device and OS-permission recovery paths. Actual push delivery remains unverified.

### Session 15 - Native Push Delivery

- The fresh test profile was made public and followed from the existing account on desktop while the iPhone was locked with BiteTribe backgrounded.
- The new-follower push arrived within 60 seconds, used understandable German copy, and tapping it launched BiteTribe into the correct target view without an error or raw key.
- Result: pass for the real native APNs/FCM delivery and notification-tap pipeline.
- The daily leaderboard notification remains unverified: it runs at 09:00 Europe/Zurich and compares production `meta/leaderboard` with `meta/leaderboardDaily`; the test did not mutate that production baseline merely to force a rank-change send.

### Session 16 - Disposable-Account Deletion

- The deletion page did not identify the signed-in disposable account before the irreversible action. [Issue #1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234) now names the account on the page and repeats it in the final confirmation and the password prompt, and refuses a deletion whose signed-in account is no longer the confirmed one (see [[issue-1234]]). Reverification on a physical iOS device through TestFlight is still open.
- The deletion contract and final destructive action were otherwise understandable.
- Password reauthentication was requested before deletion, and a visible progress state appeared.
- Deletion completed within two minutes and returned the app automatically to the unauthenticated Start screen.
- Production Firebase Authentication no longer contained the disposable test account, while the established control account remained present.
- The corresponding production `accountDeletions` job reached `completed` without an error.
- The deleted UID no longer had a `/users/{uid}` profile, `/settings/{uid}` document, or entries in its `followers`, `following`, and `pushTokens` subcollections.
- The established account's mirrored follow edge to the deleted UID was gone; the deleted account's display-name reservation, Bucket List, and authored-review query also returned no records.
- A `bites` query for the deleted UID returned no documents, while both Run-3 Bites remained present with their `userId` fields removed. The successful `Toro Tapas Ronda` Bite also retained its uploaded image; the pre-existing offline-image defect remains tracked separately by issue #1229.
- Storage under `images/users/{uid}/` was empty after deletion. Neither `meta/leaderboard` nor `meta/leaderboardDaily` retained the deleted UID or its name, email, or photo.
- No error or raw translation key appeared.
- Result: physical-iOS pass for issue #1182's complete applicable deletion contract on this fixture, including reauthentication, progress, logout, Auth, Firestore, Storage, leaderboard cleanup, control-account isolation, and surviving-Bite anonymization. BiteTrail ratings, BiteTrail sales, and authored likes are not applicable because the disposable account created none; Android remains unverified. Target-account identification fails separately under issue #1234.

### Session 17 - App Check Enforced Working Session

- Firebase Console showed Cloud Firestore App Check as `Enforced`. Its seven-day aggregate displayed 191K verified requests out of 191K total, no outdated-client requests, one unknown-origin request, and 40 invalid requests; the UI rounded the verified share to 100%.
- Storage was `Enforced` with 99% verified requests, and Authentication was `Enforced` with 96% verified requests. These Console metrics are aggregated by product and period, not attributable to a specific app build.
- Build 90 completed authenticated Firestore reads and writes throughout Run 3, including registration, Bite creation, settings changes, social activity, and the account-deletion cascade, while Firestore enforcement was active. This is direct behavioral evidence, and therefore an inference, that the TestFlight iOS artifact supplied accepted App Check tokens.
- Result: pass for the iOS enforced working-session path. The deliberately refused-token startup/retry gate remains unverified because the distributed artifact cannot be made to present an invalid token without a separate test artifact or a production configuration change; no production protection was weakened for this test.

### Session 18 - Crashlytics Non-Fatal Delivery

- Crashlytics recognized iOS release `1.0.1 (90)`, showed two active users in the preceding hour, and reported 100% crash-free users and sessions over the inspected seven-day period.
- The Non-fatals view contained five events from three users. The event produced during Run 3 was bound to build 90, iPhone 12 mini, iOS 26.5.2, and 4 August 2026 at 22:14:03; it recorded the expected offline failure, `Failed to get document because the client is offline`, through `FirebaseCrashlytics.recordException`.
- Crashlytics listed two build-90 dSYMs as `Missing (optional)` with one event each, while the dSYMs page reported zero warnings. The received report retained the build, device, OS, time, and actionable error description, so the optional symbols are recorded as a diagnostic note rather than a release defect.
- Result: pass for iOS Crashlytics session recognition and non-fatal delivery. No native crash was observed or deliberately triggered.

### Session 19 - Analytics Realtime Delivery

- The Firebase Analytics dashboard was present and receiving data. It reported three active users in the preceding 30 minutes and recognized iOS BiteTribe `1.0.1` as a successful current app release.
- After a force quit and restart on the unauthenticated Start screen, Realtime showed one active user matching the comparison `Platform exactly matches iOS; App version exactly matches 1.0.1`. The physical device had the named TestFlight build 90 installed, which binds that observed session to the artifact under test even though Analytics does not expose its build number.
- The matching iOS comparison contained five `user_engagement`, two queued `notification_open`, and one `screen_view` event. The broader unfiltered window also displayed App Check startup event names, but they were absent from the final iOS/version comparison and are not used as App Check proof.
- Result: pass for iOS production Analytics delivery and the existence of a receiving dashboard. DebugView remains unverified because a TestFlight artifact is not automatically marked as an Analytics debug device; a dedicated physical-device Xcode launch with Firebase debug mode is required if the charter retains that separate requirement.

### Run 3 Outcome

- The physical iOS execution covered fresh registration and onboarding, permissions and recovery, settings and localization, verification email, Bite creation and offline behavior, map/search/Bucket Lists/gallery/Restaurant menu/deep links, lifecycle and authentication, real push delivery, account deletion, App Check's enforced accepted-token path, Crashlytics non-fatal delivery, and production Analytics Realtime delivery.
- Release-candidate result: fail. Six findings were filed as P0 in the Bite Tribe project: #1229 offline photo recovery, #1230 reconnect feed deadlock, #1231 first inline Bucket List creation, #1232 silent local-gallery tap, #1233 cancelled menu draft leakage, and #1234 missing target-account identity before deletion.
- Four iOS evidence gaps remain explicit rather than silently passed: deliberately refused App Check token/retry behavior requires a separate invalid-token artifact or controlled environment; Analytics DebugView requires a dedicated physical-device Xcode debug-mode launch; the scheduled daily ranking notification was not forced by mutating production state; and build 90's exact source SHA, local toolchain, signing route, and upload timestamp have not been recorded.
- The disposable test account was deleted successfully. Its two anonymized Bites remain intentionally as deletion-contract evidence, including the image-less Bite that demonstrates issue #1229; do not remove them until the defect evidence is no longer needed.

### Run 3 Cleanup Inventory

- The mapping left open by Run 3 was resolved on 6 August 2026 by reading both documents. `/bites/bb03ba65-13dd-4968-be29-4ada89903d99` is the successful online Bite, with an `imagePath` set and `imageStatus` `uploaded`, created `2026-08-04T20:11:05.233Z`. `/bites/98b9d350-2a5b-4d19-8ad9-a5c2960e293a` is the offline Bite, with an empty `imagePath` and no `imageStatus`, created `2026-08-04T20:14:01.853Z`.
- That comparison is the reason both were read before release: the Build-90 offline Bite carries the same field shape as the Build-91 one, so the reported fix changed the failure mode in neither direction. The successful online Bite from the same session is the control proving the upload path itself works. Recorded as an [issue #1229 comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229#issuecomment-5208021390).
- Both documents were released for cleanup on 6 August 2026 with explicit user authorization, since the comparison above captures everything they evidenced. Remove the two Firestore documents and the Storage object belonging to `bb03ba65…`; the offline Bite has none.

## iOS Execution - Build 89

### Session 1 - Build Identity And Cold Start

- TestFlight reported build 89 on the physical device named `Mo's iPhone` (iPhone 12 mini, iOS 26.5.2).
- After a force quit, the app restored the existing session and opened the Home feed.
- No startup error, unusual loading state, or raw translation key was observed.
- Result: pass.
- Remaining build-89 checks are still in progress; this row is not yet a completed release-candidate result.

### Session 2 - Language Change In Settings

- Changing the saved language from German to English updated the UI and the Home feed to English.
- Changing it back to German updated the UI correctly.
- The language is intentionally activated when the Settings change is saved; no premature change was expected.
- No raw translation key or text code appeared during either transition.
- Result: pass for the normal Settings flow. The original onboarding transition from issue #1186 still requires a fresh-account run.

### Session 3 - Currency Selection In Settings

- The copy explaining how to add and remove favorite currencies was understandable.
- Tapping the whole GBP row toggled the favorite state; targeting an unexplained icon was no longer necessary.
- The selected state was visually unambiguous.
- The preferred/default currency was selectable without an ambiguous symbol.
- The saved selection persisted after reopening, and the tester restored EUR after the check.
- Result: pass for issue #1187 in the normal Settings flow. The shared onboarding currency controls remain part of the fresh-account run.

### Session 4 - Profile Visibility

- The current public/private state was visible on the normal signed-in profile page without opening edit mode.
- Activating the status opened the matching profile-visibility setting.
- Saving the private state updated the normal profile page to Private.
- Restoring the public state updated the normal profile page to Public.
- The restored public state persisted after reopening the profile.
- Result: pass for issue #1188.

### Session 5 - Current-Device Push Settings

- The current-device explanation was understandable and the control was enabled.
- Disabling push persisted after leaving and reopening the page.
- Re-enabling push also persisted, and iOS notification permission remained allowed.
- Result: pass for the functional device-control portion of issue #1184. Ranking-change delivery and the OS-denied recovery path remain unverified.
- New UX finding: a disabled Save button remains at the bottom even though changes apply immediately and the page can simply be left. This misleading action is tracked by [issue #1217](https://github.com/muhammedgaygisiz/travellers-apps/issues/1217).

### Session 6 - iOS Location-Denial Recovery

- With iOS location access set to Never, the app displayed a readable denied-permission explanation.
- The action labelled `Standort aktivieren` opened the correct BiteTribe page in iOS Settings.
- The label did not make the external navigation clear; the tester expected an in-app activation rather than a Settings handoff.
- On direct return after granting While Using the App, a manual refresh was needed before the restored location was detected.
- After detection succeeded, the previous location error remained visible, leaving a contradictory stale-error state.
- Location was also detected after a later force quit and restart.
- No raw translation key or technical error appeared.
- Result: partial pass with a confirmed remaining defect for issue #1183. Direct-return refresh, stale-error clearing, and clearer action copy remain open.

### Session 7 - Privacy And Account-Deletion Entry Points

- The Privacy Policy entry was discoverable in the app and the document loaded successfully.
- With the app language set to German, the policy was displayed in English; this new localization defect is tracked by [issue #1218](https://github.com/muhammedgaygisiz/travellers-apps/issues/1218). Fixed: the policy is published in all eleven app languages, and any language without policy copy gets the English document with a notice in its own language saying so (see [[issue-1218]]). Recheck the German policy on a physical device in the next pass.
- The Delete Account entry was discoverable.
- Its warning and consequences were understandable, and the flow could be cancelled safely before destructive confirmation.
- Result: pass for the non-destructive entry-point portion of issue #1182. End-to-end deletion with a disposable account remains unverified.

### Session 8 - Fresh Email/Password Registration

- The progress feedback from issue #1185 worked as intended: progress appeared immediately, the submit button was locked, the blocking loading state was understandable, and the initial tap was unambiguous.
- Registration did not complete and onboarding did not open.
- The UI remained indefinitely in the loading state without actionable failure feedback.
- No corresponding new user appeared in production Firebase Auth when the tester checked.
- After a force quit and relaunch, the app returned to an interactive unauthenticated Start screen; no session was restored and the user was still absent from Firebase Auth.
- A controlled second attempt with the same credentials reproduced the failure: after 60 seconds the app was still loading, showed no error, had created no Firebase Auth user, and remained blocked.
- Registration-dependent onboarding, verification-resend, and disposable-account deletion checks are paused until this blocker is fixed.
- Result: fail. New release-candidate blocker [issue #1219](https://github.com/muhammedgaygisiz/travellers-apps/issues/1219) tracks the non-terminating registration attempt.

### Build 89 iOS Session Outcome

- The tester stopped the run after the registration blocker reproduced twice. Registration is a pass criterion, so continuing could not produce valid release-candidate evidence for build 89.
- Passed before abort: build identity and cold start, language switching in normal Settings, currency selection in normal Settings, profile visibility, current-device push enable/disable persistence, and the non-destructive privacy/account-deletion entry points.
- Partial or failed before abort: location-denial recovery remains inconsistent under issue #1183; notification Settings has the misleading disabled Save action in issue #1217; the German app opened an English Privacy Policy in issue #1218, now localized in every app language and awaiting a device recheck; registration is blocked by issue #1219.
- Not executed because of the abort: onboarding-specific language and currency checks, verification resend, disposable-account deletion, photo upload failure and retry, ranking notification delivery, remaining critical native journeys, App Check refusal, Crashlytics, Analytics, dashboard, business app, Android, and web.
- Build 89 is not release-candidate evidence. Resume with a newer named store build after issue #1219 is fixed, starting again with fresh registration before the deferred checks.

## Preliminary iOS Execution - Build 87

### Scope And Outcome

The 28 July 2026 session exercised the store-installed TestFlight build 87 on a physical iPhone 12 mini running iOS 26.5.2 against the production backend. It established a useful baseline but cannot satisfy issue 1176 because build 87 does not contain the failed-photo state and retry workflow required by the charter. Build 88 was present in the native wrapper version files but had not yet been uploaded to TestFlight or Google Play Open Testing.

### Passed Checks

- Cold start restored the existing session and reached the Home feed without an App Check gate or startup error.
- A Bite was created with a gallery photo. The photo uploaded successfully, remained visible after reopening, and the selected restaurant, price, and EUR currency were correct.
- Map position, marker selection, Bite drawer, pan/zoom stability, and Bite navigation worked without an unexpected camera jump.
- Bite, restaurant, and city search each returned and opened the expected result.
- A Bite could be added to a Bucket List, swiped to tried, undone, and reopened with the final state preserved.
- The local gallery opened, contained the newly created Bite photo, and displayed it correctly.
- A restaurant opened from a Bite, its menu and a menu item rendered, and back navigation returned to the Bite.
- A shared `https://bite-tribe.web.app/bite/...` link opened the correct Bite in the native app.
- Background/foreground restoration, force-quit restart, logout/login, Home feed reload, and restoration of the user's existing data worked.
- Email/password registration succeeded and entered the blocking onboarding assistant.
- Identity and profile photo, public visibility, currency override, favorite currency, language, location, notifications, and completion steps all persisted.
- The verification email link worked, verified the account, and removed the in-app verification prompt without an app restart.
- With iOS location permission set to Never, Bite creation remained usable: a restaurant could be selected manually and EUR was inferred from the selected restaurant.
- A previous visit in Jordan could be selected through Google Places, an older photo could be chosen, and JOD was inferred from the restaurant location. The Bite was intentionally not saved, so the final posting-later write remains unverified.
- The public `/privacy` and `/account-deletion` routes loaded in Safari.

### Filed Findings To Triage

1. **[#1182](https://github.com/muhammedgaygisiz/travellers-apps/issues/1182): Account deletion is not available end to end.** The native app exposes no visible Privacy Policy or Account Deletion entry. The public account-deletion page only instructs the user to send an email and does not delete the account. This is a release-candidate blocker candidate because the charter identifies account deletion as a store-review requirement. Implemented: Privacy Policy is reachable from the About page, Delete Account from a destructive section on the Settings page, and the `deleteOwnAccount` callable performs the deletion with an explicit contract per data category (see [[issue-1182]]). Still open: the callable is not deployed, and the physical iOS and Android pass with disposable accounts has not been run.
2. **[#1183](https://github.com/muhammedgaygisiz/travellers-apps/issues/1183): Location denial recovery is unclear.** After changing iOS location access to Never, the app did not explain the denial or open the iOS app-settings page. Manual recovery in iOS Settings worked and the position appeared afterward. Build 89 proved the explanation and the Settings handoff, and left three defects open; all three are now fixed. The refused read carries the OS permission state, so the error card says a denial is only reversible in the settings page and labels its action as that handoff. A successful re-read clears the error even below the 100 m reload threshold, which is where a user who just restored access lands. Returning to the foreground with a location error re-reads the position immediately instead of waiting out the 30-second inactivity threshold. The map's My Position button, the original reproduction path, now settles the permission and explains a denial in an alert with the same Settings action. Re-run the deny-then-enable path on a physical iOS device in the next pass.
3. **[#1184](https://github.com/muhammedgaygisiz/travellers-apps/issues/1184): Push notification settings cannot be changed.** iOS notifications and the stored app preference were on, but the Push Notifications toggle on the app Settings page was disabled. It is now implemented: the account-wide preference is retired in favour of per-installation token controls, a persistent installation identity, an explicit current-device setup action, and an OS-permission recovery route. Physical iOS/Android verification remains open.
4. **[#1185](https://github.com/muhammedgaygisiz/travellers-apps/issues/1185): Registration transition can look unresponsive.** Registration succeeded, but the transition into onboarding took long enough without visible feedback that the tester could not tell whether the tap had worked. Fixed: registration now runs the header progress bar, locks the submit button behind a pending label, and holds a blocking overlay until onboarding is on screen. Re-verify on a physical device in the next pass.
5. **[#1186](https://github.com/muhammedgaygisiz/travellers-apps/issues/1186): Immediate language switching exposes a translation key.** English was initially selected. After choosing German, the UI did not change immediately and the transition briefly displayed `onboarding-advancing` rather than readable copy. The next Location step rendered in German. Fixed: the consumer app re-renders translated text on a language change, the assistant loads the selected locale before activating it, and leaving a step waits for an in-flight language switch before it translates the loading overlay. Re-verify on a physical device in the next pass.
6. **[#1187](https://github.com/muhammedgaygisiz/travellers-apps/issues/1187): Favorite-currency selection is not self-explanatory.** Adding EUR required tapping a heart icon whose action was not initially understood. Fixed: the shared currency selector now has two explicit modes. The preferred-currency mode picks one currency by tapping the row and only marks existing favorites with a localized note; the favorites mode says in words that a tap adds or removes a currency, toggles on the row itself, shows a checkbox plus a highlighted row for the selected state, and names each row with the action and its current state. Onboarding and Settings use the same two modes. Re-verify the currency step with a fresh user on a physical device in the build-88 pass.
7. **[#1188](https://github.com/muhammedgaygisiz/travellers-apps/issues/1188): Profile visibility is not visible on the normal profile page.** The saved public state could only be confirmed by entering profile edit. Fixed: the signed-in user's own personal profile now carries a localized public/private status with its own icon, and activating it opens the existing visibility switch in profile edit. Verify both visibility states on a physical device in the build-88 pass.
8. **[#1189](https://github.com/muhammedgaygisiz/travellers-apps/issues/1189): Verification resend lacks visible confirmation.** The resend action showed no clear in-app success message. Two messages were present afterward, consistent with the initial registration email plus the manual resend, and the newer link worked. Fixed: the resend button on home, settings, and profile edit shows a spinner with a sending label, is disabled while the callable is in flight, and the service ignores a second tap; success, one-hour throttling, already-verified, unsupported-provider, and generic failures each raise their own localized toast, and the button returns to its idle state on every outcome. Re-verify delivery with a disposable account on a physical device in the build-88 pass.
9. **[#1190](https://github.com/muhammedgaygisiz/travellers-apps/issues/1190): The profile deep-link check was a charter defect, not a product gap.** Bite sharing and native opening worked. No profile-sharing link or native profile handler was found because none was ever intended: sharing is a Bite capability, and a profile is an in-app destination reached from a Bite, a follower list, or search. The charter check has been corrected to name Bite details only, and this finding is closed as a specification correction rather than carried as implementation work. See [[issue-1190]].

### Not Executed Or Not Proven On Build 87

- Failed image-upload state and retry with the retained local copy: build 87 does not contain the implementation.
- Retry through the local-image picker when the original local copy is unavailable.
- Ranking-change notification delivery.
- A fresh iOS photo-permission prompt; photo access had already been granted and gallery selection worked.
- A fresh iOS notification-permission prompt; the OS grant already existed.
- Crashlytics non-fatal delivery, Analytics DebugView events, and the key metrics dashboard.
- App Check enforced-mode refusal and retry gate. A normal production session started, but that does not prove the build carried `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true`.
- Final save for the vacation/posting-later scenario.
- Business app manual coverage.
- Android and web execution.

### Build 88 Resume Checklist

After build 88 or newer is available in both stores:

1. Record the exact version, build number, commit SHA, TestFlight upload, and Google Play release.
2. Because [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) is still open, record the workstation toolchain and manual signing/upload route used for build 88.
3. Repeat the iOS startup/login smoke and create a Bite with a successful photo upload.
4. Force the photo upload offline, verify the failed state, restore connectivity, and verify retry with the retained local copy.
5. Exercise the fallback retry path where the original local copy is unavailable and the app asks for an image from the local gallery.
6. Recheck Bucket List swipe/undo, map position and camera stability, search, local gallery, restaurant menu, and Bite deep link because they are release-critical native journeys.
7. Reproduce and triage or resolve each filed finding above; do not silently carry build-87 findings forward as passes.
8. Complete notification delivery, Crashlytics, DebugView, dashboard, enforced App Check, posting-later save, Business app, Android, and web checks.

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

# Current State - Release Candidate Test Charter

## Purpose

This charter defines the platform test pass that has to be executed before the release candidate is cut. It exists so that "Android, iOS and web tested" on the readiness checklist in [[Current State - Release State]] means a recorded run against a named build, on named devices, with a named result, instead of an informal click-through.

It covers issue 1176 and belongs to issue 911 under [[epic-907]].

## Build Under Test

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| App identifier        | `com.bitetribe.app`                                                    |
| Marketing version     | 1.0.1                                                                  |
| Build number          | 91                                                                     |
| Configuration         | Production configuration, produced as described below                  |
| Backend               | Production Firebase project, not the emulator                          |
| App Check             | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` on for the enforced-mode checks |
| Android minimum SDK   | 24                                                                     |
| iOS deployment target | 15.6                                                                   |

Record the actual version, build number and commit SHA used, because the numbers above change with every build increment.

## How To Produce The Build

`pipeline.yml` has no native job. CI runs setup, lint, stylelint, tests, loki, e2e, the two web app builds and deploys, and the Storybook deploy, and nothing in it touches Capacitor, Gradle or Xcode. There is therefore no CI-built Android or iOS artifact to test. [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) tracks signed, commit-traceable Android and iOS CI artifacts.

The release-candidate pass must use the same distribution route as testers:

- iOS uses the named TestFlight build.
- Android uses the named Google Play Open Testing release.
- Web uses the deployed production-configuration build.

The native wrappers bundle `dist/apps/bite-tribe`. Producing the store artifacts starts from a local production build, whose safety comes from the production configuration plus an explicit check:

1. `npx nx build bite-tribe --configuration=production`
2. Confirm the bundle is clean before it is wrapped. The environment plugin strips `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` and `NX_APP_BITE_TRIBE_IS_DEV` only when `NX_TASK_TARGET_CONFIGURATION` is `production`, so a build made through any other path keeps them. Grep the emitted JavaScript in `dist/apps/bite-tribe` for the debug token value and for `IS_DEV` and expect no match.
3. `npx nx sync bite-tribe-ios` and `npx nx sync bite-tribe-android`.
4. Archive/upload from Xcode and Android Studio, distribute through TestFlight and Google Play Open Testing, and test the resulting store-installed artifacts.

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

| Platform | Device         | OS version | Physical or virtual | Notes                                 |
| -------- | -------------- | ---------- | ------------------- | ------------------------------------- |
| iOS      | iPhone 12 mini | 26.5.2     | Physical            | TestFlight build 91 run 4 in progress |
| iOS      |                |            | Simulator           | Optional second OS version            |
| Android  |                |            | Physical            | Must be a real device                 |
| Android  |                |            | Emulator            | Optional older API level              |
| Web      |                |            |                     | Chrome, plus Safari on macOS          |

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

## Android

Install the named Google Play Open Testing artifact on a physical device, then execute:

1. Registration, the blocking onboarding assistant, and continuation to the home page.
2. Login, logout, and session restore after a cold start.
3. Create a Bite with a photo, including the upload failure state and both retry paths.
4. Location permission grant and denial, currency prefill from position, and manual currency override.
5. Map view, marker selection, the Bite drawer, and camera stability while live updates arrive.
6. Search for Bites, restaurants and cities.
7. Bucket list add, swipe to tick, and undo.
8. Notification permission, and delivery of a ranking-change notification. Issue 971 landed these but device delivery is still unverified.
9. Deep links into Bite details. Profiles are not shareable and have no deep link; that is the intended product scope, not a missing feature. See [[issue-1190]].
10. Privacy policy and account deletion end to end.
11. Restaurant menus and local gallery support, which have no Playwright coverage at all.
12. App Check in enforced mode: a working session, then the retry gate when the token is refused. Google Maps Platform is read separately: Places API (New) at 0% verified is the expected reading and must not be enforced, so the evidence to record is that restaurant, city, and Bite place search still work while the Firebase APIs are enforced. See [[issue-1245]].

## iOS

Execute the same twelve checks on a physical device, plus:

13. The iOS permission prompts for photos, location and notifications, including the deny-then-enable-in-Settings path.
14. Behavior after backgrounding and returning, and after a force quit.

## Edge Cases

These are named on the readiness checklist and have never been tested explicitly:

- Vacation usage: create Bites far from the home location, across a currency boundary.
- Posting later: create a Bite for a place visited earlier, with the position no longer matching.
- Missing location: no permission, no signal, and a location that resolves to nothing usable.

## Business App

The business app has no Playwright coverage. Cover at minimum restaurant maintenance and BiteTrail creation manually, or record explicitly that the business app is out of scope for this release candidate.

## Monitoring

- Confirm Crashlytics receives a report from each native platform. Note what the app actually sends: `FirebaseErrorHandlerService` calls `recordException`, which files a **non-fatal**, and it only runs on a native platform. A JavaScript error never crashes the native process, so there is no path that produces a fatal crash report from app code. Trigger an unhandled Angular error, restart the app so the report uploads, and expect it under Non-fatals rather than Crashes.
- Verify the analytics events in DebugView from a real device, not only from the web build.
- Confirm the key metrics dashboard exists and receives data.

## Pass Criteria

- Every check above is executed and recorded as pass, fail, or not applicable, with the reason.
- No open defect that prevents registration, login, Bite creation with a photo, or app start.
- Crashlytics receives a non-fatal from each native platform, and analytics receives events from every platform.
- No crash observed on a supported OS version during the pass.

Anything else found is filed, triaged, and either fixed under issue 1177 or accepted as a known issue.

## Result Log

Record one row per platform per execution. Keep previous rows when re-running after fixes.

| Date         | Platform | Build                 | Device                     | Result                                                                                                      | Defects filed                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | -------- | --------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 Aug 2026   | iOS      | TestFlight 1.0.1 (91) | iPhone 12 mini, iOS 26.5.2 | Run 4 executed; release-candidate fail with six open P0 findings; #1230, #1231, #1233, #1234 verified fixed | [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229), [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244), [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245), [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181), [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246), [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) |
| 4 Aug 2026   | iOS      | TestFlight 1.0.1 (90) | iPhone 12 mini, iOS 26.5.2 | Run 3 executed; release-candidate fail with six P0 defects and four recorded evidence gaps                  | [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229), [#1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230), [#1231](https://github.com/muhammedgaygisiz/travellers-apps/issues/1231), [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232), [#1233](https://github.com/muhammedgaygisiz/travellers-apps/issues/1233), [#1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234) |
| 3 Aug 2026   | iOS      | TestFlight 1.0.1 (89) | iPhone 12 mini, iOS 26.5.2 | Failed and aborted: registration blocker #1219 reproduced twice                                             | [#1217](https://github.com/muhammedgaygisiz/travellers-apps/issues/1217), [#1218](https://github.com/muhammedgaygisiz/travellers-apps/issues/1218), [#1219](https://github.com/muhammedgaygisiz/travellers-apps/issues/1219)                                                                                                                                                                                                                               |
| 28 July 2026 | iOS      | TestFlight 1.0.1 (87) | iPhone 12 mini, iOS 26.5.2 | Preliminary partial pass; not release-candidate evidence because build 88 was not distributed               | Issues [#1182](https://github.com/muhammedgaygisiz/travellers-apps/issues/1182) to [#1190](https://github.com/muhammedgaygisiz/travellers-apps/issues/1190)                                                                                                                                                                                                                                                                                                |

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

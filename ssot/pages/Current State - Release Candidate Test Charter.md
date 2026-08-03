# Current State - Release Candidate Test Charter

## Purpose

This charter defines the platform test pass that has to be executed before the release candidate is cut. It exists so that "Android, iOS and web tested" on the readiness checklist in [[Current State - Release State]] means a recorded run against a named build, on named devices, with a named result, instead of an informal click-through.

It covers issue 1176 and belongs to issue 911 under [[epic-907]].

## Build Under Test

| Property              | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| App identifier        | `com.bitetribe.app`                                                    |
| Marketing version     | 1.0.1                                                                  |
| Build number          | 89                                                                     |
| Configuration         | Production configuration, produced as described below                  |
| Backend               | Production Firebase project, not the emulator                          |
| App Check             | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` on for the enforced-mode checks |
| Android minimum SDK   | 24                                                                     |
| iOS deployment target | 15.6                                                                   |

Record the actual version, build number and commit SHA used, because the numbers above change with every build increment.

## How To Produce The Build

`pipeline.yml` has no native job. CI runs setup, lint, stylelint, tests, loki, e2e and the two web app builds and deploys, and nothing in it touches Capacitor, Gradle or Xcode. There is therefore no CI-built Android or iOS artifact to test. [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) tracks signed, commit-traceable Android and iOS CI artifacts.

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

| Platform | Device         | OS version | Physical or virtual | Notes                                     |
| -------- | -------------- | ---------- | ------------------- | ----------------------------------------- |
| iOS      | iPhone 12 mini | 26.5.2     | Physical            | TestFlight build 89 execution in progress |
| iOS      |                |            | Simulator           | Optional second OS version                |
| Android  |                |            | Physical            | Must be a real device                     |
| Android  |                |            | Emulator            | Optional older API level                  |
| Web      |                |            |                     | Chrome, plus Safari on macOS              |

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
12. App Check in enforced mode: a working session, then the retry gate when the token is refused.

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

| Date         | Platform | Build                 | Device                     | Result                                                                                        | Defects filed                                                                                                                                                                                                                |
| ------------ | -------- | --------------------- | -------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3 Aug 2026   | iOS      | TestFlight 1.0.1 (89) | iPhone 12 mini, iOS 26.5.2 | Failed and aborted: registration blocker #1219 reproduced twice                               | [#1217](https://github.com/muhammedgaygisiz/travellers-apps/issues/1217), [#1218](https://github.com/muhammedgaygisiz/travellers-apps/issues/1218), [#1219](https://github.com/muhammedgaygisiz/travellers-apps/issues/1219) |
| 28 July 2026 | iOS      | TestFlight 1.0.1 (87) | iPhone 12 mini, iOS 26.5.2 | Preliminary partial pass; not release-candidate evidence because build 88 was not distributed | Issues [#1182](https://github.com/muhammedgaygisiz/travellers-apps/issues/1182) to [#1190](https://github.com/muhammedgaygisiz/travellers-apps/issues/1190)                                                                  |

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
- With the app language set to German, the policy was displayed in English; this new localization defect is tracked by [issue #1218](https://github.com/muhammedgaygisiz/travellers-apps/issues/1218).
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
- Partial or failed before abort: location-denial recovery remains inconsistent under issue #1183; notification Settings has the misleading disabled Save action in issue #1217; the German app opens an English Privacy Policy in issue #1218; registration is blocked by issue #1219.
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
2. **[#1183](https://github.com/muhammedgaygisiz/travellers-apps/issues/1183): Location denial recovery is unclear.** After changing iOS location access to Never, the app did not explain the denial or open the iOS app-settings page. Manual recovery in iOS Settings worked and the position appeared afterward.
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

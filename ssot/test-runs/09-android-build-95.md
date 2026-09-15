# Test Run 09 - Android Build 95

## Purpose

Execution record for the release candidate test pass. Originally section "Android
Execution - Build 95 (Run 9)" of [[Current State - Release Candidate Test Charter]],
which owns the checks, the device matrix, and the pass criteria this run was
measured against.

The first Android execution in this charter. Stopped deliberately partway through on a release-candidate blocker rather than completing the matrix, at the tester's decision.

## Summary

- Date: 27 Aug 2026
- Platform: Android
- Build: Play Open Testing 1.0.1 (95), tag `build-1.0.1-95` at `f2ae6dbf`
- Device: Samsung SM-A566B, Android 16

**Run 9, the Android first execution.** Stopped deliberately on a release-candidate blocker: account deletion is impossible outside a five-minute re-auth window. Checks 1-7, 9, 11, 13 and the accepted-token half of 12 pass; check 8 partial (onboarding asks, Settings never recovers); check 10 fails. Analytics recorded as an evidence gap, not a pass

Defects filed: [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385) `P0`; [#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386), [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387) `P1`; [#1388](https://github.com/muhammedgaygisiz/travellers-apps/issues/1388), [#1389](https://github.com/muhammedgaygisiz/travellers-apps/issues/1389), [#1390](https://github.com/muhammedgaygisiz/travellers-apps/issues/1390) `P2`; [#1391](https://github.com/muhammedgaygisiz/travellers-apps/issues/1391), [#1392](https://github.com/muhammedgaygisiz/travellers-apps/issues/1392), [#1393](https://github.com/muhammedgaygisiz/travellers-apps/issues/1393), [#1394](https://github.com/muhammedgaygisiz/travellers-apps/issues/1394), [#1395](https://github.com/muhammedgaygisiz/travellers-apps/issues/1395) `P3`

## Entry State And Build Identity

- Build under test: the Google Play Open Testing artifact, `com.bitetribe.app` **1.0.1 (95)**, installer `com.android.vending`, delivered as split APKs. Tag `build-1.0.1-95` is commit `f2ae6dbf`, 23 August. The in-app menu, the About page and the Settings device row all report `1.0.1 (Build 95)`, so [issue #1303](https://github.com/muhammedgaygisiz/travellers-apps/issues/1303)'s version disagreement, found on iOS, does **not** reproduce on Android.
- Device: Samsung SM-A566B (Galaxy A56), Android 16, SDK 36, arm64, WebView 151.0.7922.137. Physical. This is the first physical Android device recorded in the matrix.
- **Bundle cleanliness proven from the artifact rather than assumed.** `base.apk` was pulled off the device and `assets/public` grepped directly: no match for `NX_APP_BITE_TRIBE_IS_DEV:`, no match for `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:`, and `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:"true"` present. Enforced mode is genuinely on in the artifact under test.
- Six commits on `develop` are **not** in build 95, two of which matter here: `171b2e6e` (#1367), which moves local image copies to app-private storage and migrates the legacy public layouts, and `32810c07` (#1384), which adds the menu loading and unavailable states. The shipped bundle still writes to `Directory.Documents`, confirmed by grepping the extracted bundle.

## Methodology - Driving The Device Over adb, And Its One Hard Limit

The run was driven over `adb` with `exec-out screencap` for evidence, `input tap` and `input text` for interaction, and `dumpsys` for OS-level truth about permissions. That combination made it possible to assert things the UI alone cannot show, such as the real state of `POST_NOTIFICATIONS`.

**The limit is worth recording, because it nearly produced a false finding.** Synthetic drags do not drive the app's JS pointer handlers. Three attempts to expand the Bitemap drawer - `input swipe` twice and a hand-built `input motionevent` DOWN/MOVE/UP sequence - all panned the Leaflet map underneath instead, which looks exactly like a hit-testing defect. The tester expanded the same drawer by finger without difficulty. Taps, typed text and scroll flings all work; anything drag-shaped has to be handed to the tester. Bucket-list swipe-to-tick was executed that way.

## What Passed

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

## Check 12 - App Check In Enforced Mode

The accepted-token half is proven from production Cloud Function logs rather than inferred from the app working. Every `deleteOwnAccount` call from this device logged `{"verifications":{"app":"VALID","auth":"VALID"}}`, against a build whose bundle carries `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:"true"`. Google Places-backed restaurant search worked throughout the run alongside enforced Firebase APIs, which is the evidence [[issue-1245]] asks for. Restaurant search took roughly ten seconds to return, worth watching but not filed.

The refused-token retry gate was not forced and remains an evidence gap, as it does on iOS.

## Check 8 - The Push Permission Gap Against iOS

Onboarding is correct: step 6 raised the real `GrantPermissionsActivity` dialog, and allowing it moved the permission to `granted=true, USER_SET`.

Settings is not. With `POST_NOTIFICATIONS` revoked at OS level, the device row still showed its toggle fully ON, with no blocked-state explanation and no recovery action. On the pre-existing account the same row read ON while the OS reported `importance=NONE userSet=false`, meaning the permission had never been requested for that account at all, and toggling the row off and on raised no prompt.

This is the direct contrast with iOS, where run 6 session 15 recorded that disabling the permission in iOS Settings was recognised, explained, and given an action that opened the right Settings page. **[Issue #1184](https://github.com/muhammedgaygisiz/travellers-apps/issues/1184)'s OS-permission recovery route exists on iOS and does not exist on Android.** Filed as [#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386). Delivery of a ranking-change notification remains unverified, and #1386 is why.

**Since fixed, and not yet verified on a device.** The blocked state, the recovery action and the copy for both already existed - none of it appeared on Android because only `denied` counted as muted, and Capacitor returns a `POST_NOTIFICATIONS` revoked in system settings to an unspent `prompt`. The three symptoms are one assumption: the row's switch now shows what actually arrives rather than the stored `enabled` flag, a muted device is explained, switching it back on asks the OS instead of writing Firestore, and Android has a settings route at last - a native intent in the app's own wrapper, because App Launcher has no URL for it. The reasoning is in [[issue-1386]]. This check is the test that closes it, and it also unblocks the ranking-change delivery check waiting behind it.

## Check 10 - The Blocker That Ended The Run

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

## Monitoring

- **Crashlytics** initialises correctly - `Initializing Firebase Crashlytics 20.0.3` on every cold start - but a non-fatal was not triggered before the run stopped. Not verified.
- **Analytics is an evidence gap, not a pass.** With `debug.firebase.analytics.app` set, logcat reports `App measurement disabled by setAnalyticsCollectionEnabled(false)` and no event logging follows. The only call site in the repo is the DEV-only branch in `provide-firestore-utils.ts`, which build 95 cannot reach, and nothing anywhere calls `setEnabled({ enabled: true })`. Filed as [#1387](https://github.com/muhammedgaygisiz/travellers-apps/issues/1387).

  **Since confirmed and fixed, and not yet verified on a device.** The suspected mechanism was read out of the shipped SDK: `play-services-measurement-impl` keeps the flag in the `com.google.android.gms.measurement.prefs` SharedPreferences file under `measurement_enabled`, so a dev build's disable outlives the process, the build, and the install that wrote it - and `android:allowBackup="true"` puts it inside auto-backup's default set, so even clearing app data may not undo it. Production now states the flag: the non-dev path calls `setEnabled({ enabled: true })` on native platforms. The transport question is answered too, and it is native - `AnalyticsService`, `setCurrentScreen`, `setUserId`, and the App Check telemetry all go through `@capacitor-firebase/analytics`, so the disabled flag was silencing the app's own events, not only the auto-collected ones. The one call that disagreed, `FirebaseErrorHandlerService`'s `exception`, went through the JS SDK on every platform and now branches with the rest. The reasoning is in [[issue-1387]]. **Build 95 cannot be used to check this**: only a build carrying the fix repairs the device.

## Two Cross-Platform Results Worth Keeping

- **Confirmed.** The iOS observation that the onboarding location step ignores an already-granted permission reproduces exactly on Android: step 5 opened offering `Share my location` with `Next` disabled while `ACCESS_FINE_LOCATION` was already `granted=true`, whereas step 6 recognised its grant as soon as it existed. It is a shared behaviour of the assistant, not an iOS quirk.
- **Refuted for Android.** Run 7's web finding that the local gallery is not scoped to the account does **not** hold here. Under the first account the gallery listed exactly the image written to `/sdcard/Documents/<firebase-uid>/`, and after registering a second account it showed the empty state while the first account's file was still on disk. The scoping defect is web-specific, and that should be checked before any fix is designed from the web finding.

## Findings Filed

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

## Run 9 Outcome

**Release-candidate fail for the Android half**, on one P0, [#1385](https://github.com/muhammedgaygisiz/travellers-apps/issues/1385). The run was stopped at that point by decision rather than completed, so the Android half is also incomplete.

Executed and passed: checks 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, and the accepted-token half of 12. Partial: check 8, where onboarding passes and Settings fails. Failed: check 10's deletion half.

Not executed, recorded rather than silently skipped: delivery of a ranking-change notification; the App Check refused-token retry gate; a Crashlytics non-fatal; Analytics DebugView, blocked by #1387; the location-denial and no-signal edge cases; and the business app, which remains unscoped for this release candidate.

## Run 9 Cleanup Inventory

Left in place at the end of the run, deliberately recorded because a later run will meet them:

- The test Bite `Run9 Test Bite` at Kayseri Mantı Evi, Ümraniye, still live on the tester's own account, along with its local copy under `/sdcard/Documents/3HaVavOKbzRuNjg6p2ceUAH0pgh2/` and its Gallery entry.
- The throwaway account `Run9 Tester` still exists, because #1385 prevented its deletion. It can be removed by signing in and deleting within five minutes, which is also the clean confirmation test for #1385.
- The device is signed out of the tester's own account.
- `debug.firebase.analytics.app` is **still set** on the device. The clear was attempted at the end of the run but the device had already been disconnected, so it is still pending: `adb shell setprop debug.firebase.analytics.app .none.`
- Photo access was granted as "Allow limited access" during the run and was not revoked.
- 115 legacy image copies remain in public `/sdcard/Documents`, which is [#1395](https://github.com/muhammedgaygisiz/travellers-apps/issues/1395).

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

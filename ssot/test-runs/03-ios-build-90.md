# Test Run 03 - iOS Build 90

## Purpose

Execution record for the release candidate test pass. Originally section "iOS
Execution - Build 90 (Run 3)" of [[Current State - Release Candidate Test Charter]],
which owns the checks, the device matrix, and the pass criteria this run was
measured against.

## Summary

- Date: 4 Aug 2026
- Platform: iOS
- Build: TestFlight 1.0.1 (90)
- Device: iPhone 12 mini, iOS 26.5.2

Run 3 executed; release-candidate fail with six P0 defects and four recorded evidence gaps

Defects filed: [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229), [#1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230), [#1231](https://github.com/muhammedgaygisiz/travellers-apps/issues/1231), [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232), [#1233](https://github.com/muhammedgaygisiz/travellers-apps/issues/1233), [#1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234)

## Entry State

- The tester reported TestFlight build 90 installed on the same physical device: `Mo's iPhone`, an iPhone 12 mini running iOS 26.5.2.
- Issue [#1219](https://github.com/muhammedgaygisiz/travellers-apps/issues/1219) is closed after the build-89 registration blocker was fixed.
- Run 3 starts with a fresh email/password registration as the resume gate. The run must not continue to the deferred matrix unless registration reaches onboarding and the corresponding Firebase Auth user exists.
- Exact source commit, TestFlight upload timestamp, local toolchain, and signing route for build 90 remain to be recorded.
- Result: in progress.

## Session 1 - Fresh Registration Resume Gate

- The unauthenticated Start screen opened without error after a force quit.
- Registration progress and duplicate-submit locking appeared immediately.
- A fresh email/password registration completed within 60 seconds.
- Exactly one corresponding user was present in production Firebase Auth.
- The app opened the blocking onboarding assistant.
- No error or raw translation key appeared.
- Result: pass. Issue #1219 is physically verified as fixed in build 90, so Run 3 continues.

## Session 2 - Onboarding Through Location

- Identity: expected-language copy, test name entry, media-library profile photo selection, preview, and the transition to Profile visibility all passed without an error or raw key.
- Profile visibility: the explanation and selected state were clear; Private was selected and the transition to Currency passed. Persistence remains to be checked on the normal profile after onboarding.
- Currency: GBP was selected by tapping the whole row, the selected state was clear, and the transition to Language passed. Persistence remains to be checked after onboarding.
- Language: German was selected; the loading transition contained readable copy, no raw key appeared, and the next Standort step rendered fully in German. Result: the original onboarding scenario from issue #1186 passes on build 90.
- Standort: the step did not display a coordinate or place. Activating the in-app action did not open iOS Settings; it changed the step to an explicit Standort aktiviert state, produced no error, and allowed the transition to Benachrichtigungen. This granted/onboarding path passes and is distinct from the OS-denied recovery behavior tracked by issue #1183.
- Result: pass through the Standort step.

## Session 3 - Notifications, Completion, Coach Marks, And Persistence

- The Benachrichtigungen explanation was understandable, activation was enabled, the active state was clear, and the transition to Fertig passed without an error or raw key.
- Finishing onboarding opened the Home feed and displayed the expected first-run coach marks.
- Every coach mark was visible, targeted the correct UI element, used understandable German copy, navigated correctly, and closed at the end without an error or raw key.
- The normal profile displayed Private, confirming persistence of the onboarding visibility choice.
- Settings retained German, GBP, and current-device notifications enabled.
- The email-verification reminder was visible for the fresh unverified account.
- Result: pass. The onboarding scenarios from issues #1184, #1186, #1187, and #1188 are physically verified in build 90; notification delivery remains separate.

## Session 4 - Verification Resend And Completion

- Resend immediately showed a sending state, disabled the action while in flight, and displayed a clear success confirmation.
- One additional verification message arrived from `muhammed.gaygisiz@bitetribe.app`.
- The newest link was opened and completed on a desktop.
- When the iPhone was activated again, BiteTribe synchronized the verified state and removed the reminder without an app restart.
- No error or raw translation key appeared.
- Result: pass for issue #1189 and the end-to-end email-verification journey.

## Session 5 - German Privacy Policy

- From the German app session, the Privacy Policy heading and inspected body sections rendered in German.
- No unexpected English content or fallback-language notice appeared.
- Returning to BiteTribe worked without an error or raw translation key.
- Result: pass for issue #1218 on a physical iOS device.

## Session 6 - Notification Settings Save Action

- The button is explicitly labelled `Einstellungen speichern` and belongs to the general settings area.
- Spacing visually separates that general settings/save area from the current-device notification control, whose changes apply immediately.
- The tester found the distinction understandable and considered the original ambiguity resolved.
- Disabling and re-enabling current-device notifications each persisted after reopening the page.
- No error or raw translation key appeared.
- Result: pass for push-setting persistence and issue #1217; the existing closed issue state is correct.

## Session 7 - iOS Location Denial Recovery

- Setting BiteTribe location access to Never produced a readable denial message.
- The app-specific action labelled `Der Standortzugriff für BiteTribe` opened the correct BiteTribe page in iOS Settings.
- After restoring While Using the App and returning directly, BiteTribe recognized the location automatically.
- No manual refresh was required, the old error cleared after successful recovery, and no raw key or technical error appeared.
- Result: pass for issue #1183; the existing closed issue state is physically verified as correct on build 90.

## Session 8 - Successful Bite Photo Upload And Foreign Currency

- A gallery photo was selected and previewed successfully.
- `Toro Tapas Ronda` was selected through the restaurant/place search.
- The form inferred EUR from the selected restaurant despite the account's GBP default, covering an explicit foreign-place currency case.
- Saving completed without a hang; the uploaded photo remained visible and the Bite was complete after reopening.
- No error or raw translation key appeared.
- Result: pass for successful photo upload, persistence, place selection, and location-derived currency.

## Session 9 - Offline Photo Upload Failure State

- A second Bite was fully prepared with a different gallery photo; Airplane Mode was enabled and Wi-Fi disabled immediately before Save.
- Save left the create page and a local Bite entry remained visible after 60 seconds offline.
- The selected photo disappeared, no explicit failed-photo state or readable error appeared, and no retry action was available.
- The app remained otherwise interactive.
- Result: fail. [Issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) tracks the missing bounded failure state, retained-local-copy representation, and retry path.

## Session 10 - Reconnect After Offline Bite Save

- After Airplane Mode was disabled and Wi-Fi restored, the Home feed entered a full-page loading state and displayed a location error.
- The loader did not settle after more than 60 seconds; no delayed photo failure state or retry appeared.
- Navigation remained usable. Profile showed both test Bites, including the offline-created Bite with its image missing.
- Returning to Home reproduced the same indefinite loading state.
- A force quit and online restart recovered Home and cleared the location error; both Bites appeared exactly once and the app was usable again.
- The offline-created Bite still had no photo, failed state, or retry after restart, so issue #1229 persists independently.
- Result: fail. [Issue #1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230) tracks bounded reconnect synchronization, feed availability, and the interacting location-error state.

## Session 11 - First Bucket List Creation From A Bite

- With no lists on the fresh account, the Bite add dialog showed a correct empty-state explanation and offered list creation.
- Creating the first list from that inline flow showed success but persisted no list, added no membership state to the Bite, and showed no error.
- Control path: creating `Run 3 Test` directly under My Bucket Lists persisted correctly; it then appeared in the Bite add dialog, the Bite was added, and membership displayed correctly.
- Result: fail for the inline create-and-add path, tracked by [issue #1231](https://github.com/muhammedgaygisiz/travellers-apps/issues/1231); direct list creation and subsequent add pass.

## Session 12 - Map, Search, Bucket List, Gallery, And Restaurant

- Map loaded, My Position worked, the successful Bite marker and drawer were correct, Bite navigation/back passed, and pan/zoom caused no unexpected camera jump.
- Bite, restaurant, and city searches each returned and opened the expected result; back navigation and loading states passed.
- With the directly created list, swipe to tried, undo, persistence after reopening, and opening the Bite from the list all passed.
- Local gallery loaded and contained the successful uploaded photo, but tapping the image produced no visible response and opened neither a viewer nor the Bite. [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) tracks the silent interaction.
- The initially selected Restaurant was reachable from the Bite and back navigation passed. It had no menu, so a separate searchable Restaurant was used for the menu journey recorded below.
- No raw translation key or technical error appeared.

## Session 13 - Bite Deep Link And Restaurant Menu Journey

- Sharing the successful Bite produced a `/bite/` link; opening it outside BiteTribe launched the native app, opened the correct Bite, and allowed correct back navigation.
- A Restaurant with a menu was found through search and the menu loaded successfully.
- Individual menu-item detail pages are not part of the specified product flow. The supported action is Create Bite from a menu item.
- Create Bite was present, opened the form with the correct Restaurant and dish/menu item prefilled, and could be cancelled with correct back navigation.
- After returning to Home, a later generic Create Bite action still contained the cancelled Restaurant and menu-item data. [Issue #1233](https://github.com/muhammedgaygisiz/travellers-apps/issues/1233) tracks this transient draft state leaking into a new creation session.
- No error or raw translation key appeared.
- Result: Bite deep linking and initial menu prefill pass; cancellation cleanup fails under issue #1233.

## Session 14 - Lifecycle, Authentication, And Notification Permission Recovery

- Returning after 30 seconds in the background preserved a usable state without a hang.
- Force quit/restart restored the authenticated session, loaded Home, showed both test Bites exactly once, and produced no location error, endless loader, or raw key.
- Logout reached the unauthenticated Start screen; login completed without a hang and restored Home, profile, both Bites, and the Bucket List.
- With iOS Allow Notifications disabled, BiteTribe recognized and explained the OS-blocked state and opened the correct app Settings page.
- After re-enabling notifications, the in-app manual refresh recognized the active state and cleared the old hint without a force quit or restart.
- Result: pass for lifecycle/session restoration, logout/login, and issue #1184's current-device and OS-permission recovery paths. Actual push delivery remains unverified.

## Session 15 - Native Push Delivery

- The fresh test profile was made public and followed from the existing account on desktop while the iPhone was locked with BiteTribe backgrounded.
- The new-follower push arrived within 60 seconds, used understandable German copy, and tapping it launched BiteTribe into the correct target view without an error or raw key.
- Result: pass for the real native APNs/FCM delivery and notification-tap pipeline.
- The daily leaderboard notification remains unverified: it runs at 09:00 Europe/Zurich and compares production `meta/leaderboard` with `meta/leaderboardDaily`; the test did not mutate that production baseline merely to force a rank-change send.

## Session 16 - Disposable-Account Deletion

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

## Session 17 - App Check Enforced Working Session

- Firebase Console showed Cloud Firestore App Check as `Enforced`. Its seven-day aggregate displayed 191K verified requests out of 191K total, no outdated-client requests, one unknown-origin request, and 40 invalid requests; the UI rounded the verified share to 100%.
- Storage was `Enforced` with 99% verified requests, and Authentication was `Enforced` with 96% verified requests. These Console metrics are aggregated by product and period, not attributable to a specific app build.
- Build 90 completed authenticated Firestore reads and writes throughout Run 3, including registration, Bite creation, settings changes, social activity, and the account-deletion cascade, while Firestore enforcement was active. This is direct behavioral evidence, and therefore an inference, that the TestFlight iOS artifact supplied accepted App Check tokens.
- Result: pass for the iOS enforced working-session path. The deliberately refused-token startup/retry gate remains unverified because the distributed artifact cannot be made to present an invalid token without a separate test artifact or a production configuration change; no production protection was weakened for this test.

## Session 18 - Crashlytics Non-Fatal Delivery

- Crashlytics recognized iOS release `1.0.1 (90)`, showed two active users in the preceding hour, and reported 100% crash-free users and sessions over the inspected seven-day period.
- The Non-fatals view contained five events from three users. The event produced during Run 3 was bound to build 90, iPhone 12 mini, iOS 26.5.2, and 4 August 2026 at 22:14:03; it recorded the expected offline failure, `Failed to get document because the client is offline`, through `FirebaseCrashlytics.recordException`.
- Crashlytics listed two build-90 dSYMs as `Missing (optional)` with one event each, while the dSYMs page reported zero warnings. The received report retained the build, device, OS, time, and actionable error description, so the optional symbols are recorded as a diagnostic note rather than a release defect.
- Result: pass for iOS Crashlytics session recognition and non-fatal delivery. No native crash was observed or deliberately triggered.

## Session 19 - Analytics Realtime Delivery

- The Firebase Analytics dashboard was present and receiving data. It reported three active users in the preceding 30 minutes and recognized iOS BiteTribe `1.0.1` as a successful current app release.
- After a force quit and restart on the unauthenticated Start screen, Realtime showed one active user matching the comparison `Platform exactly matches iOS; App version exactly matches 1.0.1`. The physical device had the named TestFlight build 90 installed, which binds that observed session to the artifact under test even though Analytics does not expose its build number.
- The matching iOS comparison contained five `user_engagement`, two queued `notification_open`, and one `screen_view` event. The broader unfiltered window also displayed App Check startup event names, but they were absent from the final iOS/version comparison and are not used as App Check proof.
- Result: pass for iOS production Analytics delivery and the existence of a receiving dashboard. DebugView remains unverified because a TestFlight artifact is not automatically marked as an Analytics debug device; a dedicated physical-device Xcode launch with Firebase debug mode is required if the charter retains that separate requirement.

## Run 3 Outcome

- The physical iOS execution covered fresh registration and onboarding, permissions and recovery, settings and localization, verification email, Bite creation and offline behavior, map/search/Bucket Lists/gallery/Restaurant menu/deep links, lifecycle and authentication, real push delivery, account deletion, App Check's enforced accepted-token path, Crashlytics non-fatal delivery, and production Analytics Realtime delivery.
- Release-candidate result: fail. Six findings were filed as P0 in the Bite Tribe project: #1229 offline photo recovery, #1230 reconnect feed deadlock, #1231 first inline Bucket List creation, #1232 silent local-gallery tap, #1233 cancelled menu draft leakage, and #1234 missing target-account identity before deletion.
- Four iOS evidence gaps remain explicit rather than silently passed: deliberately refused App Check token/retry behavior requires a separate invalid-token artifact or controlled environment; Analytics DebugView requires a dedicated physical-device Xcode debug-mode launch; the scheduled daily ranking notification was not forced by mutating production state; and build 90's exact source SHA, local toolchain, signing route, and upload timestamp have not been recorded.
- The disposable test account was deleted successfully. Its two anonymized Bites remain intentionally as deletion-contract evidence, including the image-less Bite that demonstrates issue #1229; do not remove them until the defect evidence is no longer needed.

## Run 3 Cleanup Inventory

- The mapping left open by Run 3 was resolved on 6 August 2026 by reading both documents. `/bites/bb03ba65-13dd-4968-be29-4ada89903d99` is the successful online Bite, with an `imagePath` set and `imageStatus` `uploaded`, created `2026-08-04T20:11:05.233Z`. `/bites/98b9d350-2a5b-4d19-8ad9-a5c2960e293a` is the offline Bite, with an empty `imagePath` and no `imageStatus`, created `2026-08-04T20:14:01.853Z`.
- That comparison is the reason both were read before release: the Build-90 offline Bite carries the same field shape as the Build-91 one, so the reported fix changed the failure mode in neither direction. The successful online Bite from the same session is the control proving the upload path itself works. Recorded as an [issue #1229 comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229#issuecomment-5208021390).
- Both documents were released for cleanup on 6 August 2026 with explicit user authorization, since the comparison above captures everything they evidenced. Remove the two Firestore documents and the Storage object belonging to `bb03ba65…`; the offline Bite has none.

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

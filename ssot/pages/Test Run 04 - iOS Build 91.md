# Test Run 04 - iOS Build 91

## Purpose

Execution record for the release candidate test pass. Originally section "iOS
Execution - Build 91 (Run 4)" of [[Current State - Release Candidate Test Charter]],
which owns the checks, the device matrix, and the pass criteria this run was
measured against.

## Summary

- Date: 6 Aug 2026
- Platform: iOS
- Build: TestFlight 1.0.1 (91)
- Device: iPhone 12 mini, iOS 26.5.2

Run 4 executed; release-candidate fail with six open P0 findings; #1230, #1231, #1233, #1234 verified fixed

Defects filed: [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229), [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244), [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245), [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181), [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246), [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232)

## Entry State

- The tester reported TestFlight build 91 installed on the same physical device: `Mo's iPhone`, an iPhone 12 mini running iOS 26.5.2.
- Run 4 is a complete iOS regression pass after reported fixes for Run-3 findings #1229 through #1234; closure state on GitHub does not replace physical verification.
- The repository branch `test-run-4` was clean when execution began.
- The two anonymous Run-3 Bites remain preserved under the cleanup inventory and must not be removed during this run.
- Exact source commit, TestFlight upload timestamp, local toolchain, and signing route for build 91 remain to be recorded.
- Result: in progress.

## Session 1 - Build Identity, Session Restore, And Unauthenticated Cold Start

- TestFlight showed build 91 installed.
- Before the unauthenticated check, the app correctly restored the existing authenticated session; the tester explicitly logged out rather than treating session restoration as a startup defect.
- After logout and a complete termination/relaunch, BiteTribe opened the unauthenticated Start screen.
- The Start screen has no page-level loading state, so loader settlement was not applicable. A subsequent authenticated login had already shown normal bounded loading behavior.
- No error, technical text, or raw translation key appeared.
- Result: pass for build identity, authenticated session restoration, logout persistence, and unauthenticated cold start.

## Session 2 - Fresh Registration Gate

- A new disposable email/password registration form opened correctly.
- One submit immediately produced visible progress and locked duplicate submission.
- Registration completed within 60 seconds and opened the mandatory onboarding assistant.
- Exactly one matching new user existed in production Firebase Authentication.
- No error or raw translation key appeared.
- Result: pass; Run 4 continues to the full onboarding and regression matrix.

## Session 3 - Onboarding Identity

- The identity explanation rendered in the expected language and was understandable.
- A unique test profile name was accepted.
- A profile photo could be selected from the existing iOS media-library permission and rendered correctly in the preview.
- Continuing opened Profile visibility.
- No error, technical text, or raw translation key appeared.
- Result: pass.

## Session 4 - Onboarding Profile Visibility

- The public/private explanation was understandable and the selected state was visually unambiguous.
- Tapping the whole row selected Private, and the resulting Private state was clear.
- Continuing opened Currency.
- No error, technical text, or raw translation key appeared.
- Result: pass; Private persistence remains to be checked on the completed profile.

## Session 5 - Onboarding Currency

- The favorite/preferred-currency explanation was understandable.
- Tapping the whole GBP row selected it as a favorite, and the favorite state was clear.
- GBP could be set as the preferred currency with an unambiguous selected state.
- Continuing opened Language.
- No error, technical text, or raw translation key appeared.
- Result: pass; GBP persistence remains to be checked after onboarding.

## Session 6 - Onboarding Language

- English was preselected and the initial selected state was unambiguous.
- Tapping the whole German row changed the selection clearly to German.
- Continuing showed a visible, understandable loading state without a raw translation key.
- The next Standort step rendered fully in German.
- No error or technical text appeared.
- Result: pass for an actual onboarding language transition.

## Session 7 - Onboarding Location

- The Standort explanation was fully German, understandable, and made the activation action clear.
- The activation action responded immediately and produced an unambiguous Standort-activated state.
- Continuing opened Benachrichtigungen.
- No new iOS permission dialog was expected because the app-level permission survived the installed-app update.
- No error, technical text, or raw translation key appeared.
- Result: pass.

## Session 8 - Onboarding Notifications

- The German notification explanation was understandable.
- The page correctly recognized and clearly displayed the already-active app-level iOS notification permission retained by the installed app.
- No contradictory activation prompt appeared, and continuing opened Fertig.
- No error, technical text, or raw translation key appeared.
- Result: pass for onboarding state recognition; push-token ownership and delivery to the new account remain to be tested end to end.

## Session 9 - Onboarding Completion And Coach Marks

- The Fertig page rendered fully in German with understandable copy.
- Completion opened Home without a hang and automatically started the coach-mark sequence.
- Every coach mark was visible, targeted the correct UI element, used understandable copy, navigated correctly, and the final step closed the sequence.
- No error, technical text, or raw translation key appeared.
- Result: pass.

## Session 10 - Onboarding Persistence

- The completed profile displayed Private.
- Settings persisted German, GBP as a favorite, GBP as the preferred currency, and active current-device notifications.
- The email-verification reminder was visible for the new unverified account.
- No error, technical text, or raw translation key appeared.
- Result: pass for persistence of all inspected onboarding choices.

## Session 11 - Email Verification

- Resend immediately showed a sending state, disabled duplicate action, and ended with a clear success confirmation.
- Exactly one new message arrived from an expected BiteTribe sender.
- The newest verification link completed successfully on desktop.
- Reactivating the iPhone synchronized the verified state and removed the reminder without an app restart.
- No error, technical text, or raw translation key appeared.
- Result: pass for the full verification journey.

## Session 12 - Privacy And Account-Deletion Entry Points

- The Privacy Policy was discoverable from About; its heading and inspected sections rendered fully in German without unexpected English copy or a fallback notice.
- Back navigation returned correctly.
- Delete Account was discoverable in Settings, but the destructive flow was intentionally deferred until the end of Run 4.
- No error, technical text, or raw translation key appeared.
- Result: pass for legal copy and both entry points.

## Session 13 - Settings Language And Save Semantics

- The general settings area was visually separated from current-device notifications, and its action was explicitly labelled `Einstellungen speichern`.
- Selecting English did not change the UI prematurely; saving changed the interface fully to English without a raw key or technical text.
- Selecting and saving German restored German, which persisted after leaving and reopening Settings.
- No error appeared.
- Result: pass.

## Session 14 - In-App Current-Device Notifications

- The current-device notification switch disabled immediately without using the general Settings save action and remained disabled after reopening.
- Re-enabling also applied immediately and remained active after reopening.
- No error, technical text, or raw translation key appeared.
- Result: pass; the switch was left active for delivery testing.

## Session 15 - iOS Notification Permission Recovery

- Disabling Allow Notifications in iOS Settings was recognized by BiteTribe, produced an understandable blocked-state explanation, and exposed an action that opened the correct BiteTribe Settings page.
- After re-enabling the iOS permission, BiteTribe did not update immediately on direct return; navigating away from and back to the page refreshed the state.
- After that page transition, the old blocked hint cleared, the active state was unambiguous, and no app restart was required.
- No error, technical text, or raw translation key appeared.
- Result: pass with page-transition refresh behavior explicitly recorded.

## Session 16 - iOS Location Permission Recovery

- After changing location access to Never, BiteTribe did not recognize the denial immediately on return; a Home pull-to-refresh exposed the understandable denial state and app-specific recovery action.
- The recovery action opened the correct BiteTribe page in iOS Settings.
- Restoring While Using the App was recognized immediately on direct return without another refresh or restart.
- The old location error cleared, Home loaded normally with a bounded loading state, and no technical error or raw translation key appeared.
- Result: pass with initial denial detection requiring Home pull-to-refresh.

## Session 17 - Online Bite Photo And Foreign Currency

- A new gallery photo was selected and previewed correctly.
- Restaurant/Places search selected a Euro-area restaurant successfully.
- EUR was set directly from the selected place despite the account's preferred GBP currency.
- Save immediately showed progress, prevented duplicate submission, and completed within 60 seconds.
- The Bite appeared exactly once, retained its uploaded photo, and reopened with complete data.
- No error, technical text, or raw translation key appeared.
- Result: pass for the online baseline and foreign-location currency behavior.

## Session 18 - Offline Bite Photo Failure State

- A second complete Bite with a different gallery photo was saved exactly once after Airplane Mode was enabled and Wi-Fi disabled.
- The app left the create page controllably, kept the Bite exactly once, and remained navigable without an endless full-page loader.
- The selected photo was not displayed or otherwise represented as retained for recovery.
- No visible pending state, localized failed-photo state, or Retry action appeared within 60 seconds or afterwards.
- No technical text or raw translation key appeared.
- Result: fail. Build 91 physically reproduces issue #1229 despite the reported thirty-second timeout fix; retained-copy retry and missing-copy fallback remain unreachable from the UI.

## Session 19 - Foreground Reconnect After Offline Save

- Connectivity was restored in the foreground without terminating BiteTribe.
- The Home loading state settled within 60 seconds; no stale location error appeared.
- Feed content rendered normally and navigation remained usable throughout and afterwards.
- Profile contained both Run-4 Bites, with the offline-created Bite exactly once.
- Returning to Home did not re-enter an endless loader, and no technical text or raw translation key appeared.
- Result: pass for issue #1230 on build 91. The missing photo state remains independently failed under #1229.

## Session 20 - First Inline Bucket List Creation

- On the fresh account with zero lists, the successful online Bite showed a clear empty add-to-Bucket-List state and offered inline creation.
- Creating the first list reported success only after it completed; the list appeared under My Bucket Lists and persisted after reopening.
- The current Bite was added exactly once, displayed its membership, and produced neither a duplicate list nor duplicate membership.
- No error, technical text, or raw translation key appeared.
- Result: pass for issue #1231's repaired first-list create-and-add path on build 91. The direct My Bucket Lists control path remains to be checked.

## Session 21 - Bucket List Control Paths

- Creating a second list directly under My Bucket Lists persisted after reopening.
- Adding the offline Bite to that existing list produced exactly one membership with a clear selected state.
- Swipe to tried, Undo, and persistence of the restored state all worked on the online Bite.
- Opening the online Bite from the first list and returning both navigated correctly.
- No error, technical text, or raw translation key appeared.
- Result: pass; issue #1231 and the wider Bucket List regression contract are physically verified on build 91.

## Session 22 - Local Gallery Viewer And Gestures

- The successful online Bite photo was visible in the local gallery; tapping the tile gave immediate response and opened the correct image in the full-screen viewer.
- The multi-image position counter, pinch zoom, pan while zoomed, double-tap zoom, and horizontal paging all worked without unusable gesture conflict.
- The top-right close action returned to the same gallery scroll position.
- No error, technical text, or raw translation key appeared.
- Result: pass for issue #1232's gallery viewer and physical gesture contract. Open-Bite navigation and details-page viewer remain to be checked.

## Session 23 - Gallery Bite Navigation And Details Viewer

- Reopening the online photo exposed Open Bite and navigated to the correct Bite.
- Back returned to the gallery at the same scroll position with the viewer closed.
- Tapping the dish image on the normal Bite details page opened the same full-screen viewer; zoom and close worked, and no redundant Open Bite action appeared there.
- No error, technical text, or raw translation key appeared.
- Result: pass for all reachable issue #1232 paths on build 91. The blocking not-found modal for an already-deleted Bite remains unverified because this run has no safe deleted-Bite local-gallery fixture.

## Session 24 - Cancelled Menu Draft Then Generic Create

- A Restaurant with a menu loaded successfully, and Create Bite on a menu item opened the form with the correct Restaurant and dish prefilled.
- Cancelling through back navigation without saving returned controllably to the prior journey and then to Home.
- Starting the normal Create Bite flow from Home afterwards produced a clean form: neither the cancelled Restaurant nor the cancelled dish was present, and only intentional global defaults remained.
- No error, technical text, or raw translation key appeared.
- Result: pass for issue #1233's cancel-then-generic-create path on build 91. Cancel-then-another-menu-item, background/route reuse, and a successful menu-derived save remain to be checked.

## Session 25 - Alternate Menu Draft, Background, And Successful Save

- A different menu item opened Create Bite with the correct Restaurant and new dish; no data from the previously cancelled item leaked into the form.
- Backgrounding BiteTribe for approximately thirty seconds and returning preserved the current creation session correctly without resurrecting the cancelled draft.
- Completing and saving the menu-derived Bite succeeded exactly once, and reopening it preserved the intended Restaurant and dish.
- A later generic Create Bite action from Home was clean again and contained no Restaurant or dish from either menu flow.
- No error, technical text, or raw translation key appeared.
- Result: pass; all physical acceptance paths for issue #1233 are verified on TestFlight build 91.

## Session 26 - Map Position, Marker, And Camera

- The map loaded completely and My Position moved to the current device position correctly.
- A marker for a successfully saved Bite was visible and exposed the correct Bite in the map drawer.
- Opening that Bite and returning to the map both navigated correctly.
- Manual pan and zoom worked without an unexpected camera jump.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS map regression contract on build 91.

## Session 27 - Bite, Restaurant, And City Search

- Searching for a saved Bite returned the expected result; opening it and returning both navigated correctly.
- Restaurant search returned and opened the expected Restaurant, with correct back navigation.
- City search returned and opened the expected location result, with correct back navigation.
- Every loading state settled normally, and no error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS search regression contract on build 91.

## Session 28 - Cold External Bite Deep Link

- Sharing a successfully saved Bite produced a `/bite/` link that could be opened from outside BiteTribe after the app was fully terminated.
- The link cold-launched the native app, preserved the authenticated session, and opened the correct Bite.
- Back navigation remained controlled, all loading settled, and no error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS cold deep-link contract on build 91.

## Session 29 - Lifecycle, Logout, And Login

- Returning from approximately thirty seconds in the background preserved a usable Home state.
- A normal cold launch restored the authenticated session; Home settled without an endless loader, and the profile, all three Run-4 Bites exactly once, and the Bucket Lists remained complete.
- Logout reached Start, and Start persisted across a full termination and relaunch.
- Signing back into the same Run-4 account restored Home and all expected profile, Bite, and Bucket List data.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS lifecycle and authentication regression contract on build 91.

## Session 30 - Native New-Follower Push Delivery And Tap

- The Run-4 test profile was made public and remained discoverable from the established desktop account.
- Following it exactly once while BiteTribe was backgrounded and the iPhone locked produced exactly one push within 60 seconds.
- The notification copy was understandable German, and tapping it opened BiteTribe without an error or technical text.
- The tap landed on the Home feed instead of the new follower's profile, contrary to the notification navigation contract and the supplied `followerUid` payload.
- Result: fail for target navigation under [issue #1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244); real APNs/FCM delivery, localization, and app launch pass.

## Session 31 - App Check Enforced Working Session

- Firebase Console showed `Enforced` for Storage, Cloud Firestore, and Authentication after the Build-91 physical run.
- The seven-day overview reported Storage at 98% verified and 2% unverified, Cloud Firestore at 100% verified and 0% unverified, and Authentication at 96% verified and 4% unverified; the tester observed no conspicuous invalid or unknown-request increase during Run 4.
- Build 91 completed extensive authenticated reads and writes while those Firebase APIs were enforced, including registration, settings, Bite creation, social activity, and push-token use. This is behavioral evidence, and therefore an inference, that the distributed TestFlight artifact supplied accepted App Check tokens.
- Places API (New) remained in Monitoring at 0% verified and 100% unverified; [issue #1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) records this separate protection gap rather than silently treating Places as covered.
- Resolved after the run by [[issue-1245]], and the reading was the finding: BiteTribe reaches Places only server-to-server from Cloud Functions, Google Maps Platform App Check only accepts tokens from the client Maps and Places SDKs, so 0% verified is what this architecture must report and enforcement would break every place search. The equivalent control is the callable in front of Places - App Check enforced plus an authenticated caller - now pinned by build-failing specs. The next run reads Places as expected-unverified and records that place search works while the Firebase APIs stay enforced.
- Result: pass for the Firebase iOS enforced working-session path, but fail for verified Places traffic under #1245. The aggregates are not build-specific, and the deliberately refused-token startup/retry gate still requires a separate invalid-token artifact or controlled environment.

## Session 32 - Crashlytics Delivery And Symbols

- Crashlytics recognized the latest iOS release as 1.0.1 (91); crash-free users and crash-free sessions were both 100%, with no crash issue for the build.
- One non-fatal event from one user arrived for build 91 on 6 August 2026. It was the expected background connectivity error from the deliberate offline test: `Failed to get document because the client is offline` on the Run-4 iPhone 12 mini / iOS 26.5.2.
- This artifact-specific event verifies production Crashlytics delivery from the TestFlight build.
- Crashlytics nevertheless reported build-91 UUIDs `AD1CE4AB-6356-3948-B714-8DBA6B834959` and `D4B24778-B39E-32D1-B6DB-8ADA39E23516` as `Missing (optional)`, each associated with one event. The evidence is attached to [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181), which must retain and upload symbols for the exact native artifact.
- Result: pass for Crashlytics event delivery and crash-free health; native symbol retention/upload remains a P0 release-pipeline gap under #1181.

## Session 33 - Production Analytics Delivery

- Analytics Realtime showed an active iOS user for app version 1.0.1 after fresh activity on Build 91.
- The filtered comparison received `screen_view`, `user_engagement`, `notification_open`, and `bite_viewed`, covering normal navigation, engagement, the real push tap, and Bite interaction from the physical run.
- No complete absence or abnormal failure of iOS events was observed.
- The processed `Latest app release overview` card remained empty even after the report range was changed to include 6 August. Because Realtime already proves current production delivery and standard reports are delayed, this is recorded as a dashboard evidence gap to recheck after processing rather than as a current app defect.
- Result: pass for iOS production Analytics Realtime delivery. Build number 91 is not an Analytics comparison dimension; DebugView and the processed release-overview card remain unverified.

## Session 34 - Target-Account Identity Before Deletion

- The deletion page showed the disposable account's photo, display name, e-mail address, and sign-in method, which is the identity surface [issue #1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234) reported missing in Run 3.
- The final confirmation and the password dialog each repeated the identity in a reduced form, display name and e-mail only, without the photo and sign-in method. Both still name the exact account being destroyed, so the tester accepted this as sufficient rather than a defect.
- Every step showed the Run-4 disposable account. The main account never appeared at any point in the flow.
- Result: pass for the #1234 identity contract on Build 91; the reduced repetition on the confirmation and password steps is recorded as an observation, not a finding.

## Session 34 - Pre-Deletion Firebase Snapshot

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

## Session 34 - Disposable-Account Deletion Execution

- The deletion ran on the physical device with password reauthentication. The password dialog stayed on screen after submission with only its input field cleared, while a loading state was visible behind it; the app then returned to the start screen on its own after roughly 30 seconds with no error text or raw technical output.
- `/accountDeletions/rd6fEZTWcxbzoIgM65QQxPUqSYH2` reported `status: completed`, started at `2026-08-06T17:28:49.867Z` and finished at `2026-08-06T17:28:59.393Z`. Server-side execution therefore took 9.5 seconds, far inside the two-minute expectation.
- The persisted counters matched the pre-deletion snapshot exactly: `anonymizedBites` 3, `deletedBucketlists` 2, `deletedFollowEdges` 2 for the single follower's edge and counter-edge, `deletedPushTokens` 1, and zero for likes, reviews, ratings, and BiteTrail sales, which the disposable account never produced.
- Result: pass. The reduced identity repetition and the password dialog that stays open during the cascade are recorded as observations; neither blocked the flow, and neither reaches the P0 bar this charter requires for a filed finding.

## Session 34 - Deletion Contract Verification

- Authentication: the disposable account was gone and the main account `3HaVavOKbzRuNjg6p2ceUAH0pgh2` remained untouched.
- Removed as required: `/users/rd6f…`, `/settings/rd6f…`, and the `/displayNames/momo` reservation, which releases the name for reuse.
- Social graph: the counter-edge `/users/3HaV…/following/rd6f…` was gone and the main account's `followingCount` moved from 49 to 48, so the follow trigger corrected the surviving user's aggregate.
- Both Bucket Lists `4TZII7JRADpjSmLIQy49` and `8bciVEiqufkrstJ5GnFX` were deleted.
- All three Bites survived with the `userId` field removed rather than emptied, matching the anonymization contract that keeps shared content reachable for other users' Bucket Lists and BiteTrails.
- Storage: the profile image `images/users/rd6f…/8d8fec8c-c799-4b59-a641-d7fa67162798.jpg` was deleted, and both Bite images were intentionally retained for the later authorized cleanup.
- Leaderboard removal could not be evidenced in this run because the account never entered the persisted top 10; this branch of the cascade remains unverified rather than passed.
- Result: pass for the account-deletion contract on Build 91. [Issue #1234](https://github.com/muhammedgaygisiz/travellers-apps/issues/1234) stays closed, now backed by physical verification instead of a reported fix.

## Session 35 - Cold Bite Deep Link On Web

- Found after the deletion while resolving which local gallery photo belonged to which Bite, not as a planned charter step.
- A cold external `https://www.bitetribe.app/bite/<biteId>` never opens the Bite. Signed out it ends on `/start`, reproduced directly against production; signed in it ends on the Home feed, observed on the tester's desktop for two different Bites.
- Mechanism: on a cold load `authState()` is still `null`, `authGuard` waits on `authStateChange$` behind a fixed `debounceTime(2000)` and returns `/start` when that elapses, and `startGuard` then forwards an authenticated user to `/home`. The requested URL is discarded in both directions and never restored after sign-in.
- Independent of the anonymization and of #1229: a normal Bite carrying a `userId` behaves the same, and the equivalent cold external deep link passed on iOS in Session 28.
- Filed as P0 [issue #1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) in the Bite Tribe project, cross-referenced from [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) as a probable shared root cause: both lose a deep target requested while auth state is unrestored on a cold start.
- Result: fail. Bite sharing is the product's only share surface, so every shared link currently fails for its recipient.

## Session 36 - Deleted-Bite Gallery Fixture

- Deleting two Run-4 Bites while their local photo copies stayed on the device created the deleted-Bite local-gallery fixture that Session 22 lacked, which closes the last unverified acceptance criterion of [issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232).
- Opening such an image with "Open Bite" produces an indefinite loading state on the details page. No blocking not-found modal appears, and there is no error text or raw technical output.
- `biteIdFromImageName` deliberately performs no existence check and leaves the missing-Bite case to the details page, which is the correct split; the details page is the part that neither resolves nor reports.
- Result: fail. #1232 was reopened with this evidence and already carried P0. A useful side effect for other reports: an indefinite loading details page is the observable signature of a Bite that cannot be found.

## Run 4 Outcome

- The physical iOS execution covered build identity and cold start, fresh registration, the full onboarding chain, permissions and their recovery paths, settings and localization, email verification, Bite creation online and offline, reconnect behavior, Bucket Lists, the local gallery, menu drafts, map, search, deep links, lifecycle and authentication, real push delivery, App Check, Crashlytics, production Analytics, and the destructive account deletion.
- Four Run-3 findings verified as fixed on Build 91: #1230 reconnect feed deadlock, #1231 first inline Bucket List creation, #1233 cancelled menu draft leakage, and #1234 missing target-account identity before deletion. #1232 passed its gallery interaction contract but was reopened after cleanup exposed the deleted-Bite case, see Session 36.
- Release-candidate result: fail. Six P0 findings remain open: [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) offline photo recovery, still reproducible after a reported fix; [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) push tap opening Home instead of the follower profile; [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) Places API traffic fully unverified under App Check; [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) missing build-91 dSYMs in the native pipeline; [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) cold Bite deep links never opening the Bite on web; and the reopened [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) for the missing deleted-Bite not-found modal.
- Evidence gaps recorded rather than silently passed: the refused App Check token and retry gate still needs an invalid-token artifact or controlled environment; Analytics DebugView needs a dedicated Xcode debug-mode launch; the processed `Latest app release overview` card was still empty and must be rechecked after processing; the scheduled daily ranking notification was not forced; the leaderboard branch of the deletion cascade was not exercised; and build 91's exact source SHA, local toolchain, signing route, and TestFlight upload timestamp are still unrecorded.

## Run 4 Cleanup Inventory

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

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

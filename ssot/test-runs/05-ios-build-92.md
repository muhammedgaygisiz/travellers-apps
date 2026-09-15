# Test Run 05 - iOS Build 92

## Purpose

Execution record for the release candidate test pass. Originally section "iOS
Execution - Build 92 (Run 5)" of [[Current State - Release Candidate Test Charter]],
which owns the checks, the device matrix, and the pass criteria this run was
measured against.

## Summary

- Date: 8 Aug 2026
- Platform: iOS
- Build: TestFlight 1.0.1 (92)
- Device: iPhone 12 mini, iOS 26.5.2

Run 5 executed partially by decision; release-candidate fail with two open P0 findings; #1229, #1244, #1246 verified fixed and #1230, #1245 confirmed

Defects filed: [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) reopened, [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) still open, plus [#1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) to [#1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273) non-blocking

## Entry State

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

## Session 1 - Build Identity, Session Restore, And Unauthenticated Cold Start

- TestFlight showed `BiteTribe 1.0.1 (92)`, expiring in 90 days, with `What to Test` copy naming the desktop feed layout, deep links, and push notifications.
- Settings confirmed the device as `Mo's iPhone`, iPhone 12 mini, iOS 26.5.2.
- A cold launch from the home screen, after a full force quit, restored the existing authenticated session and opened the German Home feed. The feed settled with real content and a resolved distance to the Bite's location, so no endless loader and no stale location error appeared.
- The signed-in account was identified on the profile page as the main account `Mo` / Muhammed Gaygisiz, Bern, showing 604 Bites, 48 following, and 33 followers. The following count of 48 independently corroborates the Run-4 deletion evidence, which recorded the cascade moving the main account from 49 to 48.
- The account identity was not discoverable from the app menu and required navigating to the profile. Filed as future feature [issue #1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260); it did not block the run.
- Logout reached the Start screen, and Start persisted across a complete termination and relaunch.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: the Start screen mixes languages in one view, with a `Log In` primary action beside a `Registrieren` secondary action in an otherwise German session.
- Result: pass for build identity, device identity, authenticated session restoration, logout persistence, and unauthenticated cold start.

## Session 2 - Fresh Registration Gate

- The Run-5 account is `muhammed.gaygisiz@bitetribe.app`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`. It is the disposable account for this run and every first-run check below was executed with it unless stated otherwise.
- The registration form rendered in German with all four password rules satisfied and visibly confirmed.
- One submit produced a visible spinner, observed by the tester. The screen transition itself fell between two consecutive burst frames, so registration completed in under roughly 2.4 seconds, far inside the 60-second expectation. Duplicate-submit locking was not separately evidenced because the request never stayed in flight long enough to attempt a second tap.
- Registration opened the mandatory onboarding assistant at `Step 1 of 7`, with the German success toast `Registrierung erfolgreich! Bitte überprüfe deine E-Mail, um dein Konto zu verifizieren.`
- Exactly one matching new user existed in production Firebase Authentication.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: the first onboarding page rendered in English while the success toast over it rendered in German. A fresh account starting in English matches Run 4, so the toast is the outlier and appears to carry the previous session's language.
- Result: pass; Run 5 continues to the full onboarding and regression matrix.

## Session 3 - Onboarding Identity

- The identity explanation rendered in English, which is the expected fresh-account language before the later language step, and was understandable.
- The unique test profile name `run5mo` was accepted, with an explicit green `Display name is available.` confirmation.
- A profile photo was selected from the media library and rendered correctly in the preview. iOS showed no new photo permission prompt, which is expected because build 92 was installed over build 91 and the app-level permission survived.
- Continuing opened Profile visibility.
- No error, technical text, or raw translation key appeared.
- Finding, filed rather than blocking: between confirming the chosen photo and the preview rendering, the avatar area is empty with no pending state, so the photo appears to vanish before it appears. `identity-step.component.html` switches straight from the fallback icon to the `img` element as soon as the form control holds the value, and the element paints nothing until its own `load` event fires. Filed as [issue #1261](https://github.com/muhammedgaygisiz/travellers-apps/issues/1261).
- Result: pass, with #1261 recorded against the photo preview.

## Session 4 - Onboarding Profile Visibility

- The public/private explanation was understandable, and it named the concrete consequences of a public profile: leaderboard participation, followers, and attributed Bites.
- Tapping the `Go public` row on its description text, not on the radio control, moved the selection correctly, and tapping the `Stay private` row the same way moved it back. Both resulting states were visually unambiguous through the filled radio and the highlighted border.
- The run was completed as Private, matching the Run-4 baseline so the two runs stay comparable. The profile is made public later for the follower push test.
- Continuing opened Currency.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: `Next` is disabled until the user makes an explicit selection, even though `Stay private` is rendered as preselected. The initial radio state is therefore cosmetic rather than a real selection. This is defensible for a privacy decision and is recorded rather than filed.
- Result: pass; Private persistence remains to be checked on the completed profile.

## Session 5 - Onboarding Currency

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

## Session 6 - Onboarding Language

- English was prefilled from the device, which is correct: English is first in the iPhone's Preferred Languages. The language prefill therefore reads the device correctly, which is a useful contrast to the currency suggestion in [issue #1262](https://github.com/muhammedgaygisiz/travellers-apps/issues/1262) and narrows that issue to the currency path alone.
- Selecting German switched the entire step to German immediately, matching its own promise that the app changes language at once.
- Build 92 improves on Run 4 here: Run 4 had to pass through a visible loading transition on this step, and build 92 switched without one.
- No error, technical text, or raw translation key appeared, and the whole page rendered in German.
- Result: pass for an actual onboarding language transition.

## Session 7 - Onboarding Location

- The Standort explanation was fully German, understandable, and named four concrete reasons for the permission rather than asking for it abstractly.
- The activation action responded immediately and produced an unambiguous green `Standort ist aktiviert.` state, after which `Weiter` became enabled.
- iOS showed no new permission dialog, which is expected because the app-level grant survived the update from build 91.
- No error, technical text, or raw translation key appeared.
- Observation, not a finding: the step opens as though location had never been granted, with `Weiter` disabled, even though the permission was already active and the Home feed had already resolved a real distance before onboarding began. The notification step, by contrast, recognizes an existing grant. The two steps therefore treat pre-existing permissions inconsistently. This matches Run 4 and is not a build-92 regression.
- Result: pass.

## Session 8 - Onboarding Notifications

- The German notification explanation was understandable and named concrete reasons: leaderboard changes, new followers and reactions, and per-device management in settings.
- The page opened already showing the green `Benachrichtigungen sind aktiviert.` state with `Weiter` enabled, correctly recognizing the app-level iOS permission retained through the update. No contradictory activation prompt appeared.
- This is the direct comparison that confirms the Session-7 observation rather than leaving it as an impression: with both permissions already granted, the notification step recognizes the grant and the location step does not.
- No error, technical text, or raw translation key appeared.
- Result: pass for onboarding state recognition; push-token ownership and delivery to the new account remain to be tested end to end.

## Session 9 - Onboarding Completion And Coach Marks

- The Fertig page rendered fully in German and personalized the confirmation with the chosen display name, `Alles bereit, run5mo!`.
- Completion opened Home without a hang and started the coach-mark sequence automatically. The first mark was already on screen before the feed images finished loading, so the sequence did not wait on content.
- All four coach marks were visible, targeted the correct element, used understandable German copy, and each offered a single `Verstanden` action: `Bites entdecken` on the feed, `Entdecke BiteTribe` on the menu control, `Gestalte deinen Feed` on the search, Bitemap, and sort filter row, and `Einen Bite teilen` on the create action.
- The final mark closed the sequence and left a clean, fully rendered Home.
- The email-verification reminder was visible for the new unverified account, with a resend action.
- No error, technical text, or raw translation key appeared.
- Result: pass.

## Session 10 - Onboarding Persistence

- The completed profile displayed `run5mo`, the selected photo, and `Privates Profil` with its German explanation, so the Session-4 visibility choice survived onto the real profile. Counts were 0 Bites, 0 following, and 0 followers, as expected for a fresh account.
- Settings persisted German, `British Pound Sterling` as both the preferred currency and the currency favorite, and an active current-device notification switch. `Einstellungen speichern` was correctly inert with no pending change.
- The email-verification reminder was visible for the new unverified account, on both Home and Settings, with a resend action.
- No error, technical text, or raw translation key appeared.
- Physical confirmation of an existing open defect: the two-minute-old free account displays a `PRO` badge on the profile and a highlighted `PRO` card under `Kontotyp` in Settings. This is [issue #1127](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127), where `createUserOnAuthCreate` writes `subscriptionTier: 1`. Evidence and one correction were added as an [issue #1127 comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127#issuecomment-5225707129): that issue assumes the wrong tier is invisible today, but it is rendered to the user on two separate surfaces. The `Kontotyp` cards were checked in `settings.component.html` and carry `role="status"` with no click handler, so this is a display defect and not a client-side entitlement control.
- Finding, filed rather than blocking: the push-device row reads `iOS 18.7 · 1.0.1 (92)` on a device running iOS 26.5.2. `describeCurrentInstallation` derives the description from `navigator.userAgent` by deliberate design, and WKWebView freezes the OS version it reports there, so the parser faithfully reports a value the user agent invented. The app version is correct. Filed as [issue #1263](https://github.com/muhammedgaygisiz/travellers-apps/issues/1263); the value is also persisted with the push token, so stored data inherits it. The fix approach was decided during the run and recorded on the issue: read the version from the native `@capacitor/device` plugin rather than the user agent, and do not fall back to omitting the version.
- Result: pass for persistence of all inspected onboarding choices, with #1263 filed and #1127 physically confirmed.

## Session 11 - Email Verification

- Resend showed a clear success confirmation and then disabled the resend action, so duplicate sending was locked.
- Exactly one new message arrived per request, and the newest link completed verification successfully on a desktop.
- Reactivating the iPhone synchronized the verified state and removed the reminder from Home and Settings without an app restart, which exercises the build-92 change in [issue #1255](https://github.com/muhammedgaygisiz/travellers-apps/issues/1255).
- No error, technical text, or raw translation key appeared.
- Result: pass for the full verification journey, with two mail defects filed below.

### Session 11 note - the ordering that found the mail defects

Run 5 deliberately verified email _after_ switching the app to German, where Run 4 verified before touching the language. That single change made two mails comparable across a language change and exposed defects Run 4 could not have seen, because in Run 4 both mails were legitimately English. Future runs should keep verification after the language step for this reason.

- The registration mail at 12:02 came from `noreply@bitetribe.app`, subject `Verify your email for Bite Tribe`, in English with `lang=en` on the link. Correct, because the account was still English at that moment.
- The manual resend at 12:37 came from `muhammed.gaygisiz@bitetribe.app`, subject `Verify your Bite Tribe email address`, in English while the account language was German.
- [Issue #1264](https://github.com/muhammedgaygisiz/travellers-apps/issues/1264), language: `google-workspace-email.ts` holds `SUBJECT`, `BODY`, and the link label as hardcoded English constants, and `resendEmailVerificationForUser` never reads the recipient's language, so there is no value to localize with. Every user of the eleven shipped languages receives this account-security mail in English.
- [Issue #1265](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265), sender identity: the resend `From` header is built from the delegated Google Workspace user, so a personal mailbox is published to every user who requests a resend, and the same operation presents two different senders and two different subjects. The registration mail's `bite-tribe.firebaseapp.com` action link is recorded on the same issue as a related brand and trust decision.
- Fixed in #1265: the visible sender is its own setting, `GOOGLE_WORKSPACE_SENDER_ADDRESS`, and the delegated mailbox no longer reaches a recipient. The two subjects are reconciled towards the localized catalog wording by editing the Firebase Auth console template, and the action link is deliberately left on the default domain until after 1.0.1 because it is also the OAuth redirect origin. See [[issue-1265]]. Retest needs a real send: Workspace must accept the address as a `Send mail as` alias of the delegated mailbox or Gmail rewrites `From` back, which no unit test can catch.
- Neither is release-blocking; both are recorded against the mail path rather than the app.

## Session 12 - Online Bite With A Foreign Position And Foreign Currency

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

## Session 13 - Bite Details And Currency Conversion

- Opening the new Bite started a four-step details coach-mark sequence. The inspected marks were German, understandable, and correctly targeted, including `Verstehe diesen Bite` and `Diesen Bite teilen` on the share control.
- The details page reopened with complete data: photo, title `Test Online`, three stars, `Toro Tapas Ronda`, `Ronda, Spanien`, the reaction and bookmark controls, and the map at the Bite's Spanish position.
- Currency conversion works and matches what the coach mark promises. The Bite was saved in EUR and the page displays `£4.32` in the account's preferred currency with the original `€5.00` beneath it, so neither the stored value nor the reader's currency is lost.
- Finding, filed rather than blocking: the timestamp rendered as `5 min ago` in an otherwise fully German page. [Issue #1272](https://github.com/muhammedgaygisiz/travellers-apps/issues/1272).
- Reading `time-ago.pipe.ts` for that finding exposed two further defects in the same file that are not observable on screen, and they are recorded on the same issue. `Math.abs` on the time difference makes a future timestamp render as elapsed time. More seriously, the pipe's parameter defaults to a hardcoded `2025-05-17` constant, so the `if (!value) return ''` guard never sees an absent argument and a Bite with no `createdAt` renders a confident relative age measured from an arbitrary date instead of rendering nothing.
- Result: pass for details rendering, data round trip, and currency conversion, with #1272 filed against relative time.

## Session 14 - Offline Bite Photo Failure State And Recovery

Screen mirroring drops with Airplane Mode, so the offline window was captured with on-device screenshots and transferred afterwards. Future runs should plan for this rather than discovering it at the moment the evidence matters.

- A second complete Bite was prepared with a different gallery photo, then Airplane Mode was enabled with Wi-Fi off before saving. These are the conditions that reproduced the defect on builds 90 and 91.
- Save produced a blocking progress state, `Dein Bite wird erstellt...`, which also evidences the duplicate-submit lock that Session 12 could not capture.
- The app left the create page controllably. Home showed `Bite erfolgreich erstellt!` together with the offline notice `Du scheinst offline zu sein. Bitte überprüfe deine Internetverbindung.`
- The Bite card showed a bounded pending state, `Foto wird hochgeladen - App geöffnet lassen`, and within about a minute it resolved to the terminal failed state `Foto konnte nicht hochgeladen werden` with an `Erneut hochladen` action. Both the failed state and the retry action appeared on the profile list and on the Bite details page.
- The Bite existed exactly once throughout, and the profile count moved to 2. The app stayed navigable with no endless full-page loader.
- Result: pass. [Issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) is physically verified as fixed on build 92, the first pass in three runs, and the evidence is attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229#issuecomment-5226299044). The Run-4 diagnosis is confirmed by its own repair: #1252 stopped disabling the photo while offline, so `imageStatus` is written, the upload starts, the watchdog arms, and the #1168 recovery machinery is finally reachable.
- Gap, recorded rather than passed: the automatic recovery consumed the chance to press `Erneut hochladen`, so the manual retry path is visible but unproven, and the missing-local-copy fallback is still unexercised.

## Session 15 - Foreground Reconnect After Offline Save

- Connectivity was restored with BiteTribe in the foreground on Home and without terminating the app.
- The failed photo state persisted briefly, then the upload recovered automatically without the user pressing retry, and the photo rendered in the feed. Recovery is therefore real rather than a repaint.
- The Home loading state settled, no stale location error appeared, and feed content rendered normally with the offline-created Bite present exactly once.
- No error, technical text, or raw translation key appeared.
- Result: pass. [Issue #1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230) remains fixed on build 92, and automatic photo recovery on reconnect is now evidenced as well.
- Two observations carried from the same screenshots: the offline Bite priced `CHF 5.00` and displayed `£4.64`, so the position-derived currency correctly resolved CHF for a Bern position, which narrows [issue #1262](https://github.com/muhammedgaygisiz/travellers-apps/issues/1262) further to the device-region prefill alone; and the timestamp rendered `just now` in English, already covered by [issue #1272](https://github.com/muhammedgaygisiz/travellers-apps/issues/1272).

## Session 16 - Deleted-Bite Gallery Fixture

- Because build 92 was installed over build 91, the Run-4 local gallery survived, including the photos whose Bites were deleted during Run-4 cleanup. The fixture Run 4 had to manufacture was therefore available directly, which is the practical benefit of the update install recorded in the entry state.
- Opening such a photo and using `Open Bite` produced an indefinite loading state: skeleton placeholders, empty stars, and a running progress bar, still identical after more than two minutes. No blocking not-found modal appeared, and no error text or raw technical output was shown.
- Result: fail. [Issue #1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) reproduces on build 92 and has been reopened with the evidence as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232#issuecomment-5226344734).
- This confirms the entry-state suspicion recorded before execution began: the issue was closed on 7 August with no fix commit, and the relevant code is unchanged since `b3aef3ab`, the build-91 code that produced the hang. Closure state on GitHub is not evidence, which is the reason this charter re-tests reported fixes physically.
- Mechanism narrowed to two candidate paths, both ending in a permanent skeleton, recorded on the issue. `biteNotFound` matches only `BiteNotFoundError`, which is thrown at exactly one place, after a read that returns no document data. A falsy `biteId` instead takes the loader's `return undefined` path and resolves _successfully_ with no Bite, and any other error, such as a timeout from the five-attempt retry wrapper or a permission rejection, is of the wrong type for the check. Which path fired here needs a log or a debug build.
- Open question for the fix, also recorded on the issue: the local gallery contains profile photos as well as Bite photos, so `Open Bite` may be offered for images that never had a Bite at all.
- Agreed during the run and recorded as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232#issuecomment-5226353055): instrument this path with a Crashlytics non-fatal covering every branch on which the resource settles without a Bite, carrying the `biteId`, the branch taken, and the navigation origin. It separates the two candidate paths that a physical run cannot separate, and it keeps the non-deleted failure modes visible after the not-found modal exists, since a user looking at a skeleton cannot report them usefully. It follows the existing `recordException` route in `FirebaseErrorHandlerService` rather than adding a mechanism.
- Useful side effect for this charter: once instrumented, exercising this path is a reliable and harmless way to produce the Crashlytics non-fatal the monitoring section requires from each native platform, instead of depending on an incidental error such as Run 4's offline connectivity exception.
- Fixed after the run, and the mechanism turned out to be neither of the two candidate paths on its own. `ResourceRef.value()` throws a `ResourceValueError` once its resource is in an error state, and `details.container.ts` bound `[bite]="service.bite.value()"` as its first input. A failed read therefore threw during the binding update and every later input on that element, `[biteNotFound]` included, was never applied, so the page kept the skeleton it already had and could not report a state it had correctly detected. The fix routes every read through a `hasValue()`-guarded accessor, classifies a settled read with no Bite as `not-found` or `unavailable` rather than matching one error class, keeps the resource idle when the route carries no `biteId`, gives a failed read a try-again action next to the way back, and files the agreed non-fatal on every settled failure through a shared `CrashReportingService`. Still to verify on a device in the next run: the blocking not-found modal on the surviving deleted-Bite fixture, the try-again path, and the non-fatal arriving in Crashlytics.

## Session 17 - Cold Shared Bite Deep Link On Web

- Executed on desktop against production, on the real link the app's share sheet produces, `https://bite-tribe.web.app/s/bite/<biteId>`, and repeated on `https://bitetribe.app/bite/<biteId>`.
- A signed-out visitor in a fresh private window lands on `/start`. This is the intended behavior, not the defect: `RequestedUrlService` documents that the target is remembered in memory for the current page and handed back by the sign-in flow.
- Signing in from that same page, without reloading, opened the requested Bite.
- A signed-in visitor opening the share link was redirected to `/bite/<biteId>` and saw the Bite directly.
- Result: pass. [Issue #1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) is physically verified as fixed, evidence attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246#issuecomment-5226415060). Run 4's worst finding, that every shared link failed for its recipient, is resolved.
- Clarification recorded so it is not rediscovered as a false defect: the share sheet emits `/s/bite/<id>` while the fix and its e2e spec exercise `/bite/:biteId`. These are not in conflict. `firebase.json` rewrites `/s/**` to the `handleSharedLinkToBite` function, which serves an Open Graph preview page for social unfurling and redirects to `/bite/<id>`, so the e2e coverage tests the destination of that redirect. This was initially misread during the run as an unrouted share path, and the correction is kept here deliberately.

## Session 18 - Native New-Follower Push Delivery And Tap

- The Run-5 profile was made public, then followed exactly once from the established main account on desktop while BiteTribe was backgrounded.
- Exactly one push arrived, with understandable German copy: `Neuer Follower!` / `Mo folgt dir jetzt.`
- Tapping it opened BiteTribe on the **follower's profile**, the main account `Mo`, not the Home feed. This is the contract Run 4 recorded as broken.
- The landing page corroborates the trigger independently: the main account's following count read 49, one higher than the 48 recorded in Session 1 before the follow.
- Result: pass. [Issue #1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) is physically verified as fixed on build 92, evidence attached as an [issue comment](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244#issuecomment-5226452160). Real APNs/FCM delivery, localization, app launch, and now target navigation all pass.
- Checked and dismissed, not a finding: Notification Centre also held an earlier BiteTribe push in Turkish, `Yeni Bite / Daniel yeni bir Bite oluşturdu`. It was delivered that morning to the main account, whose language is Turkish, so it is correct recipient-language localization per issue #1200 rather than a defect.
- Methodology limits recorded for future runs: notifications are not visible through iPhone Mirroring, and touching the physical device ends the mirroring session. Push evidence has to be captured on-device, like the Airplane Mode evidence in Session 14.

## Session 19 - Crashlytics Health, Symbols, And Build Provenance

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

## Session 20 - Lifecycle And Authentication

This session was prioritized deliberately. [Issue #1249](https://github.com/muhammedgaygisiz/travellers-apps/issues/1249) rewrote `authGuard`, `startGuard`, the onboarding guards, and the store effects, which makes session and navigation handling the riskiest change in build 92. Earlier sessions exercised parts of it incidentally; this one exercises it on purpose.

- Returning from roughly thirty seconds in the background preserved a usable Home. The feed stayed rendered, with no re-entry into a loading state and no stale location error.
- A force quit followed by a cold launch restored the run5mo session, and Home settled with content.
- Logout and signing back in restored the account fully: `Bites 2`, `Follower 1` from the Session-18 push test, the public visibility set in Session 18, the display name, and the country flags for the two Bite locations, Spain and Switzerland.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS lifecycle and authentication contract on build 92. The guard rewrite behaves correctly on background return, cold start, logout, and sign-in.
- Finding, filed rather than blocking: tapping login produces no visible response for several seconds before Home appears. The login component has no pending state to render at all - its only relevant input is `loginFailed`, and the submit action carries no disabled binding while the request is in flight. Registration, in the same auth surface, binds `[loading]="pending()"`, disables submit while pending, and renders a spinner, which Session 2 recorded as a pass. Several seconds of silence on a credential submission invites the duplicate tap registration was careful to prevent. Filed as [issue #1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273). Fixed: the pending state now lives in the auth reducer, so the login page runs the header progress bar, locks the submit action behind a pending label, and locks the Google and Apple actions with it, matching registration; the sign-in effects dropped to `exhaustMap` and the email/password round-trip is bounded so the locked form always releases. See the Sign-In Feedback Contract in [[Architecture - Auth]]. Re-verify on a physical device in the next pass.

## Session 21 - Map Position, Marker, And Drawer

- The map loaded completely, centred on Bern, with clustered markers and its own coach mark, which was understandable German.
- The My Position control moved to the device's real position and rendered it as a distinct marker.
- Tapping a cluster expanded it into individual markers carrying their ratings, and selecting one opened the drawer on the correct Bite, the run's own Bern Bite.
- Expanding the drawer showed the complete card: dish, restaurant, `0.25 KM`, `BERN, SCHWEIZ`, rating, and the reaction control, with the map still visible above.
- No error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS map contract on build 92.

## Session 22 - Bite, Restaurant, And City Search

- Bite search returned both Run-5 Bites with their photos, alongside older Bites from previous runs.
- Restaurant search returned `Johny's Road Kitchen` with an understandable German note that the restaurant is not yet verified on BiteTribe.
- City search for `New York` returned Bites in that city with their restaurants and prices, so the city filter resolves against a location the device is nowhere near.
- Every loading state settled and no error, technical text, or raw translation key appeared.
- Result: pass for the physical iOS search contract on build 92, and further evidence for [issue #1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) that place-backed search works while the Firebase APIs are enforced.
- Observation worth keeping: `Test 2` and `Test offline` from earlier runs render with placeholder icons and no photo, which is the visible residue of [issue #1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) before its fix. Today's two Bites both carry their photos, so the same search screen shows the before and after side by side.

## Session 23 - Production Analytics Delivery

- Analytics Realtime showed one active iOS user, located in Bern, during the run.
- Events received: `user_engagement` 8, `screen_view` 3, and `notification_open` 1. Views by screen were `Home`, `My Profile`, and `User Profile`.
- The `notification_open` event and the `User Profile` view are the real push tap from Session 18 and the follower profile it landed on, so Analytics corroborates the [issue #1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) verification independently of the on-device observation rather than restating it.
- No absence or abnormal failure of iOS events was observed.
- Result: pass for iOS production Analytics Realtime delivery. As in Run 4, the build number is not an Analytics comparison dimension, and DebugView still needs a dedicated Xcode debug-mode launch, which remains unverified.

## Run 5 Outcome

- The physical iOS execution covered build identity and provenance, cold start, fresh registration, the full onboarding chain and its persistence, email verification, Bite creation online and offline, reconnect and automatic photo recovery, Bite details and currency conversion, the deleted-Bite gallery fixture, the shared deep link on web, real push delivery and tap navigation, lifecycle and authentication, map, search, Crashlytics, and production Analytics.
- **Five of the six Run-4 P0 findings are resolved.** [#1229](https://github.com/muhammedgaygisiz/travellers-apps/issues/1229) offline photo failure state and retry, physically fixed after two failed runs. [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244) push tap target navigation. [#1246](https://github.com/muhammedgaygisiz/travellers-apps/issues/1246) cold shared deep link for a signed-out recipient. [#1245](https://github.com/muhammedgaygisiz/travellers-apps/issues/1245) place search under enforcement, evidenced twice. [#1230](https://github.com/muhammedgaygisiz/travellers-apps/issues/1230) reconnect behavior, confirmed still fixed.
- **Release-candidate result: fail.** Two P0s remain. [#1232](https://github.com/muhammedgaygisiz/travellers-apps/issues/1232) was reopened after reproducing on build 92; it had been closed with no fix commit, which the entry state predicted before execution began. [#1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181) is unfixed, and Run 5 corrected its framing as well as its status.
- Fourteen new issues were filed, [#1260](https://github.com/muhammedgaygisiz/travellers-apps/issues/1260) to [#1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273), none release-blocking, covering account identity in the menu, the profile photo pending state, device-region currency, the frozen iOS version, verification mail language and sender, the position source controls, the restaurant modal header, German voice, dual distances, profile name duplication, onboarding home location, relative timestamps, and the login pending state. [Issue #1127](https://github.com/muhammedgaygisiz/travellers-apps/issues/1127) was physically confirmed and one premise in it corrected.
- **The run was deliberately stopped short of the full matrix.** Once #1232 reproduced and #1181 proved unverifiable, build 92 could not become the release candidate, so executing the remaining green paths would only have to be repeated on the next build. The one area executed anyway was lifecycle and authentication, because #1249 rewrote the guards and effects and a defect there would change which fixes build 93 needs. It passed.
- Deferred to the next build's run rather than executed: settings language save semantics, the in-app per-device notification switch, iOS location and notification permission recovery, Bucket Lists, the gallery viewer gesture contract, menu drafts, the privacy policy, and the destructive account deletion. The Android and web halves have not started, and the Playwright suites were not run.
- Evidence gaps recorded rather than silently passed: the refused App Check token and its retry gate still need an invalid-token artifact; Analytics DebugView needs a dedicated Xcode debug-mode launch; the `Erneut hochladen` manual retry was never pressed because recovery was automatic, so the manual path and the missing-local-copy fallback are visible but unproven; the scheduled daily ranking notification was not forced; and the localized iOS permission prompts cannot be verified on this artifact because `738901be` postdates it.

## Run 5 Cleanup Inventory

- **The disposable account was deliberately kept alive.** `muhammed.gaygisiz@bitetribe.app`, UID `HrHvF6l6WGcpJCCMX3R1ehyUHyB3`, display name `run5mo`, is fully onboarded, email-verified, public, and followed by the main account. Retaining it lets the build-93 retest start from a real account instead of repeating registration and the seven-step assistant. It must be deleted at the end of that run, which also exercises the deletion contract deferred from this one.
- Two Bites belong to it and must be removed with it: the Session-12 online Bite `Test Online` at Toro Tapas Ronda, Spain, and the Session-14 offline Bite `Test` at Johny's Road Kitchen, Bern. Both carry uploaded photos.
- The main account gained one following edge and one follower relationship from Session 18. Its `followingCount` moved from 48 to 49 and must return to 48 when the disposable account is deleted.
- The Run-4 inventory still stands and must not be removed: the three anonymous Bites and their two Storage objects recorded under the Run-4 cleanup inventory below.
- The device app container still holds the Run-4 local gallery, which supplied this run's deleted-Bite fixture. Do not reinstall BiteTribe or clear its storage on that device until #1232 is fixed and verified.

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

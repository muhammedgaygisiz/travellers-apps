# Test Run 10 - Android Build 96

## Purpose

Execution record for the release candidate test pass. Originally section "Android
Execution - Build 96 (Run 10)" of [[Current State - Release Candidate Test
Charter]], which owns the checks, the device matrix, and the pass criteria this run
was measured against.

The Android re-run for issue 1353, executed on 29 August 2026 against a **locally built debug artifact** rather than a store artifact, and stopped by decision once the regression sweep was complete and a new `P0` was on the board.

**Result: release-candidate fail for the Android half. The run 9 blocker is resolved; a new P0 replaces it.**

## Summary

- Date: 29 Aug 2026
- Platform: Android
- Build: Local debug build 1.0.1 (96), `develop` at `78889774`
- Device: Samsung SM-A566B, Android 16

**Run 10, the Android re-run.** Executed against a locally built debug artifact rather than a store artifact, because 19 commits including the Angular 22 upgrade had never run on hardware. The run 9 blocker #1385 is **verified fixed**, and nine of the eleven run 9 findings are verified fixed on the device. Check 12 executed in full for the **first time in this charter**, refused-token gate included. Converted to a regression sweep partway through, by decision, once a new `P0` was confirmed: the photo-location feature that shipped the same morning never reads a gallery photo's GPS on Android. #1395 could not be verified, because the uninstall a local build requires dropped the file ownership the migration depends on

Defects filed: [#1414](https://github.com/muhammedgaygisiz/travellers-apps/issues/1414) `P0`; [#1411](https://github.com/muhammedgaygisiz/travellers-apps/issues/1411) `P2`; [#1412](https://github.com/muhammedgaygisiz/travellers-apps/issues/1412), [#1413](https://github.com/muhammedgaygisiz/travellers-apps/issues/1413), [#1415](https://github.com/muhammedgaygisiz/travellers-apps/issues/1415), [#1416](https://github.com/muhammedgaygisiz/travellers-apps/issues/1416), [#1417](https://github.com/muhammedgaygisiz/travellers-apps/issues/1417), [#1418](https://github.com/muhammedgaygisiz/travellers-apps/issues/1418) `P3`

## Entry State And Build Identity

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

## Why A Local Build, And What It Cost

The charter asks for the store artifact. This run deliberately used a local build because 19 commits, including the Angular 22 / NgRx 22 / TypeScript 6 upgrade in `d7e45edd`, had landed since build 95 and none of them had ever run on hardware.

The debug variant was chosen over a locally signed release APK on purpose. `apps/bite-tribe-android/android/app/build.gradle` adds `firebase-appcheck-debug` to the debug variant only; a sideloaded release APK is signed with the upload key rather than the Play app-signing key, so Play Integrity would refuse a token and the enforced-mode gate would have blocked the entire app at launch.

That choice paid for itself twice and cost once:

- **It reached check 12's refused-token half**, which no run in this charter had ever executed, simply by launching before the App Check debug secret was allow-listed.
- **It gave WebView DevTools**, so layout defects were measured rather than eyeballed.
- **It cost #1395.** A debug APK cannot install over a Play-signed one, so build 95 had to be uninstalled, and that dropped MediaStore ownership of the 115 legacy files the migration was supposed to sweep. See below.

## Checks

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

## Check 12, Executed In Full For The First Time

Run 9 could only prove the accepted-token half, because a Play-distributed build cannot be made to fail attestation on demand. A locally signed debug build fails it by default until its secret is registered.

- **Refused token:** `FirebaseAppCheck.getToken` returned `403 App attestation failed`, `preflightAppCheckToken` caught it, `isAppCheckReady` failed closed, and the router outlet was never mounted. The gate rendered its Transloco copy and blocked the app, which is issue #933 working.
- **Recovery:** after the secret was allow-listed, **Try again** ran `exchangeDebugToken`, `tokenChanged` fired, and the app resumed into the landing screen **without a restart**.
- **Google Maps Platform, read separately as the charter requires:** the nearby-restaurant list and a text restaurant search both returned results while the Firebase APIs were enforced, including Google Places entries marked "not verified on BiteTribe yet".

The gate's own layout is wrong, which is [#1411](https://github.com/muhammedgaygisiz/travellers-apps/issues/1411).

## The Eleven Run 9 Findings

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

### #1385, the run 9 blocker, resolved

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

### #1386, verified in all three parts

Revoking `POST_NOTIFICATIONS` underneath the running app and returning to Settings produced "Your device settings are blocking BiteTribe notifications", the device row read "Turned off in your device settings", and **two** recovery affordances appeared. "Turn on notifications" raised the OS dialog, and granting it cleared the warning **live, without a reload**.

### #1387, verified at two levels

`com.google.android.gms.measurement.prefs.xml` now carries `measurement_enabled_from_api=true`, which is the persisted flag that used to strand a device that had once run a dev build. DebugView then showed 48 events in thirty minutes from this device, including `coach_mark_dismissed` exactly four times, matching the four dismissed by hand, under `user_id oVclptzv...vAKxDW2`.

### #1390, verified with the network actually off

Posted with wifi and mobile data disabled, confirmed by `Active default network: none`. The upload timed out after the 30s `STALLED_UPLOAD_TIMEOUT_MS` into "Photo couldn't be uploaded" instead of spinning forever, and **no retry button was offered while offline** - the copy read "You're offline - reconnect to upload this photo". On reconnect the upload recovered on its own and the image is served from Firebase Storage at 1136x640, the fixture's dimensions.

Worth recording for the charter's wording: check 3 asks for "both retry paths", and the **manual** retry button was never reached, because reconnect recovered the upload automatically. That is the better behaviour, not a coverage gap.

### #1392, measured rather than eyeballed

The drawer was dragged open by hand, because injected `adb shell input swipe` events do not reach its JS drag handlers. With `--ion-safe-area-bottom: 48px`, the drawer published `--snap-drawer-offset: 352px` and applied `translateY(304px)`, exactly `352 - 48`. Content ends at `y=749` against a band starting at `y=784`: **35px clear**. The issue's own write-up listed "not verified on a device" as open; it is now closed.

## #1395 Could Not Be Verified, And Why

The migration ran - `Filesystem.checkPermissions()` returned `{"publicStorage":"granted"}` and `files/<uid>/` was created the moment the Gallery opened - and moved nothing. All 115 legacy files remain.

The app's own `readdir` on public `Documents` **succeeds** and returns only the three directories; not one of the 115 files is listed. Inside the uid-scoped legacy directory, the shell shows three files and the app sees zero. Scoped storage hides files the current install does not own, and the uninstall this run required is what dropped that ownership.

An in-place Play update from 95 to 96 would most likely have migrated them. But #1395 exists precisely because these files _survive uninstall_, and files that survive an uninstall are exactly the ones the app can never see again. Filed as [#1413](https://github.com/muhammedgaygisiz/travellers-apps/issues/1413).

After the run, the maintainer signed in with the account that owns `Documents/3HaVavOKbzRuNjg6p2ceUAH0pgh2/` and opened the Gallery, which closes the last confound. The first test read that directory while signed in as a _different_ account, leaving open the possibility that the second migration loop only fails on a uid mismatch. It does not: `files/3HaVavOK.../` was created, so `prepare()` ran, and stayed empty; the Gallery told the owning account "No locally saved images found." while 118 of its files sat on the device; and `readdir` on the `Documents` root returned the three directories and **zero** of the 115 files. The filtering is tied to the app install's Linux uid, `u0_a302` then `u0_a468`, not to the signed-in account, so no in-app path can ever reach these files on this device again.

A second defect surfaced from the same session. One prediction was **refuted**: the migration adopts loose files on native, so a fresh account should have inherited 115 photos from the previous owner. It did not, for the same ownership reason, and the Gallery correctly read "No locally saved images found." #1328 remains web-only, as run 9 also found.

## The New Blocker

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

## Findings Filed

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

## Raised And Dismissed By Investigation

Four candidate defects were investigated and ruled out. They are recorded so a later run does not re-open them:

- **Onboarding "Next" appearing to need a blur.** Ruled out by polling the button state without ever blurring: it enables about a second after typing, with the input still focused. What looked like a commit-on-blur bug was the display-name availability round trip.
- **The photo-locations OS dialog asking for "photos and videos" rather than locations.** Platform behaviour: `ACCESS_MEDIA_LOCATION` sits in the media permission group, so the app cannot reword the dialog. `READ_MEDIA_IMAGES` is deliberately never declared, so even "Allow all" grants only `READ_MEDIA_VISUAL_USER_SELECTED`, consistent with #1394.
- **The location step offering no way back after a denial.** Session-only; a restart restores both buttons.
- **A like chip missing on an own Bite.** Intended: read-only mode hides the chip when there is nothing to report, and the Bite had no likes.

## Methodology Notes

- **`document.body.innerText` is not the visible page.** The Ionic nav stack keeps earlier pages mounted, so `body.innerText` mixes the current step with every step behind it - it reported "Step 1 of 8" while the device showed step 2. Read the last `.ion-page` that is neither hidden nor mid-transition. The helper used here also returns device-pixel tap targets, which removes the screenshot-to-coordinate arithmetic entirely.
- **`adb shell input text` drops spaces**; use `%s`. A tap aimed at a control while the soft keyboard is up lands on the keyboard.
- **Injected drags do not reach JS drag handlers.** The Bitemap drawer had to be opened by hand.
- **The app is zoneless.** `Zone` is undefined and `setTimeout` is unpatched, so a thrown error from an injected `setTimeout` never reaches Angular's `ErrorHandler` and files no non-fatal. The Crashlytics probe therefore called `FirebaseCrashlytics.recordException` directly - the same call `FirebaseErrorHandlerService` makes - and the report uploaded on the next launch, confirmed by a request to `crashlyticsreports-pa.googleapis.com`. **This proves the transport, not the app's error-handler wiring**, which remains unverified on a device.
- **The charter's bundle greps assume double quotes.** This build's minifier emits backticks, so a value check written as `NX_...:"true"` finds nothing. The documented trailing-colon greps are unaffected.

## Not Executed

Bucket lists; deep links; the privacy policy page; logout and re-login; ranking-change notification delivery; the vacation, posting-later and no-signal edge cases; the business app; the manual retry button; #1384's menu **error** state, which could not be forced because the menu reads from the Firestore cache offline; and #1403's read-only-but-visible like chip, which needs a second account to like the Bite.

## Run 10 Outcome

**Release-candidate fail for the Android half, and incomplete by decision.**

The run 9 blocker is genuinely resolved and nine of the eleven run 9 findings are verified fixed on hardware. Against that, the feature that shipped this morning does not work on Android, and it is the reason the half still fails. The half was converted from a full charter execution to a regression sweep partway through, by decision, once #1414 was confirmed.

## Run 10 Cleanup Inventory

- **The test account is deleted.** `muhammed.gaygisiz@bitetribe.app` / uid `oVcIptzvpFY294zrSDySZvAKxDW2` was removed through the product's own deletion flow at the end of the run.
- **The test Bite was deleted first, deliberately.** The deletion disclosure says Bites survive the account without the author's name, so deleting the account first would have stranded "Run10 Geotag Test" in production permanently. Delete test Bites before deleting a test account.
- **`/sdcard/Pictures/run10-geotagged.jpg` is still on the device.** The e2e fixture pushed for the #1414 proof. Harmless, and useful if #1414 is re-tested on this device.
- **115 legacy files remain in `/sdcard/Documents`**, now orphaned beyond the app's reach. See #1413.
- **The App Check debug secret `f54c5836-59fc-465a-8a39-142586afbd62` is allow-listed** in the Firebase console for this install, and is **deliberately being kept** so the #1414 fix can be verified on this device without repeating the setup. It is tied to the install rather than to the app: redeploying over it with `nx run bite-tribe-android:run` keeps the same secret, because the debug signing key does not change, so a fix cycle needs no new registration. An **uninstall** regenerates it and leaves a dead entry in the console. Remove it when this install is finally replaced, and note that the same uninstall would again cost the file ownership #1413 depends on.
- **The device is left signed out**, with location, notifications and media-location granted, and the app in English.

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

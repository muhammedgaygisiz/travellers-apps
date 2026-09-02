# Test Run 11 - Android Build 96

## Purpose

Execution record for the release candidate test pass. Originally section "Android
Execution - Build 96 (Run 11)" of [[Current State - Release Candidate Test
Charter]], which owns the checks, the device matrix, and the pass criteria this run
was measured against.

The contingency Android re-run for issue 1354, executed on 29 August 2026 against a **locally built debug artifact installed over run 10's install**, so the App Check debug secret and the app's MediaStore file ownership both survived.

**Result: release-candidate pass for the Android half, with two checks recorded as not executable rather than executed.**

Run 10's `P0` is cleared and every run 10 finding that was closed is verified fixed on hardware. Three new findings were filed, none of them a blocker.

## Summary

- Date: 29 Aug 2026
- Platform: Android
- Build: Local debug build 1.0.1 (96), `develop` at `68f8626e`
- Device: Samsung SM-A566B, Android 16

**Run 11, the contingency Android re-run.** Installed **over** run 10's install, so the App Check debug secret and the app's file ownership survived. Run 10's `P0` #1414 is **verified fixed** four independent ways, and all seven closed run 10 findings are verified fixed on hardware. Bucket lists, deep links, logout and the privacy policy were **executed for the first time in this charter**, and the vacation edge case was covered by a Rome Bite posted from a Bern device. Check 12 reached its refused-token half again by dropping only the App Check token cache, which costs no console step. Three new findings, none a blocker; ranking-notification delivery and the OS half of deep-link verification recorded as not executable

Defects filed: [#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428) `P2`; [#1426](https://github.com/muhammedgaygisiz/travellers-apps/issues/1426), [#1427](https://github.com/muhammedgaygisiz/travellers-apps/issues/1427) `P3`

## Entry State And Build Identity

| Property   | Value                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Source     | `develop` at `68f8626e`, 7 commits after run 10's `78889774`                                                                       |
| Version    | 1.0.1 (96), `versionCode=96` - **unchanged from run 10**, so the source commit is the only build discriminator                     |
| Artifact   | `app-debug.apk`, built locally, installed **over** run 10's install rather than after an uninstall                                 |
| Device     | Samsung SM-A566B, Android 16 / SDK 36, serial `RZGYC0B33ET` - the same device as runs 9 and 10                                     |
| Web bundle | `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production --skip-nx-cache`, `main-4V4BKVR2.js` |
| Accounts   | one fresh account, `muhammed.gaygisiz@bitetribe.app`, uid `qqcOGO2bVvSBKLWC9GzsFPYCMIf1`, deleted at the end of the run            |

Bundle cleanliness was checked as the charter requires: no `NX_APP_BITE_TRIBE_IS_DEV:`, no `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN:`, and `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` present as `` `true` ``. The wrapper sync produced **no** native diff and `assets/public/` carried the `main-4V4BKVR2.js` just built.

## Installing Over, And What It Bought

Run 10 had to uninstall build 95, which cost it #1395's verification. This run installed over run 10's own debug build, which the debug signing key allows, and that preserved three things worth naming:

- **The App Check debug secret** `f54c5836-59fc-465a-8a39-142586afbd62`, still allow-listed in the console and still accepted, so the app reached its first screen with no console step.
- **The app install's Linux uid** `u0_a468`, so #1413's residual could be re-read in exactly the state its follow-up described.
- **The run 10 geotagged fixture**, so #1414 was re-tested against a byte-identical file (`md5 1c5d2597…`).

## The Seven Run 10 Findings

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

## #1414, The Blocker, Cleared

The fix is the `@capawesome/capacitor-file-picker` downgrade to 8.0.2. Four independent lines of evidence, all on the same device and the same byte-identical fixture as run 10:

| Evidence         | Run 10 (`78889774`)              | Run 11 (`68f8626e`)                                               |
| ---------------- | -------------------------------- | ----------------------------------------------------------------- |
| Picker activity  | `PickVisualMedia` (Photo Picker) | `GalleryExternalActivity` - `ACTION_PICK`, a MediaStore URI       |
| Position label   | "From photo - No GPS in photo"   | "From photo"                                                      |
| Currency prefill | stayed Swiss Franc               | flipped to **Euro**                                               |
| Map tiles        | Bern                             | z15 x17510-17511 y12178-12179 → 41.8859/12.3706 … 41.8777/12.3816 |

The currency flip is the strongest of the four because it is an independent consumer of the Bite position and cannot be produced by a label change. The restaurant picker corroborated a fifth time, returning Rome restaurants at "0.9 km from the Bite / 685.1 km from you", and the stored Bite reverse-geocoded to "La Massimina-Casal Lumbroso, Italy".

## Checks

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

## Check 12 Without Costing The Debug Secret

Run 10 reached the refused-token gate only because its secret was not yet registered - a state that cannot be re-entered without an uninstall. This run reached it a second time, and cheaply.

An offline cold start alone does **not** gate: `preflightAppCheckToken` calls `getToken({ forceRefresh: false })`, a cached token satisfies it, and the app starts into cached content behind its offline banner. The code makes no distinction between a network failure and an attestation refusal, so the gate's behaviour there is decided entirely by whether a cached token exists.

Deleting **only** `shared_prefs/com.google.firebase.appcheck.store.*.xml` - the token cache - while leaving `…appcheck.debug.store.*.xml` - the secret - untouched forces a fetch on the next launch. Offline, that fetch fails and the gate renders. Restoring the network and tapping **Try again** resumed the app **without a restart**, and the token store was rewritten against the same kept secret.

This is the repeatable way to exercise the gate on a device, and it costs no console step.

## #1411, Measured Rather Than Eyeballed

With the gate rendered: `--ion-safe-area-top` is 35px, the gate's `--padding-top` resolves to `calc(1rem + 35px)`, and the heading sits at y=326 in an 832px viewport - centred, and 291px clear of the status bar it collided with in run 10.

## New Findings

- **An empty bucket list shows the discovery feed's empty state** ([#1426](https://github.com/muhammedgaygisiz/travellers-apps/issues/1426) `P3`), "No bites found. Be the first one.", on the user's own list. This is #1417's defect on a surface its fix did not cover: `bucket-list.container.ts` never passes `emptyMessageKey`, so it inherits the default that #1417 added the override for. Verified as a direct A/B on one build - My Bites correct, bucket list wrong.
- **Settings renders currency names unlocalized** ([#1427](https://github.com/muhammedgaygisiz/travellers-apps/issues/1427) `P3`). "Swiss Franc" in Turkish, German and French, while the picker those same rows open renders "İsviçre frangı". `settings.component.ts` reads the catalog's raw English `name` in `selectedCurrencyName` and `favoriteCurrencyNames`; the onboarding step has the identical two signals and routes both through `getLocalizedCurrencyName`, so Settings is the outlier rather than the convention.
- **The Nx cache can silently disarm the App Check gate** ([#1428](https://github.com/muhammedgaygisiz/travellers-apps/issues/1428) `P2`). `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` is not part of the build target's cache key, so the charter's step 1 returned a cached bundle carrying `` ENFORCED:`false` ``. Only the charter's own step 3 grep caught it. The build needs `--skip-nx-cache`, or the variable belongs in the target's inputs.

## Raised And Dismissed By Investigation

- **Turkish casing on non-Turkish restaurant names.** "JOHNY'S ROAD KİTCHEN", "MEGA PİZZA KURİER". This is the intended consequence of #1388's document-level `lang`, which that issue asked for explicitly; "BERN, İSVİÇRE" is now correct where run 9 read "İSVIÇRE".
- **A privacy policy that names no contact address.** The bare word "Contact" is a click-to-reveal control, not a missing value; tapping it renders the address.
- **Three identical search results** for "Chicken Tikka Masala / Dörfli Schliern". Three distinct image UUIDs, so three real Bites of the same dish at one restaurant.

## Confirmed Still Open

**#1418** reproduces on this build in both halves: the local copy survived Bite deletion, and it survived account deletion. While the account lived the orphan was visible and deletable in its own Gallery; once the account was gone it joined run 10's under a uid no session will ever carry again. The device now holds **two** stranded directories, `oVcIptzv…` and `qqcOGO2b…`, one per deleted test account.

The maintainer decided during this run that a local copy **should** survive Bite deletion, so that half is now intended behaviour and what remains is the account-deletion half plus a disclosure gap: the deletion page enumerates what goes and what stays with care, and local copies appear in neither list.

## Methodology Notes

- **Read the page by what is painted, not by DOM order.** The Ionic nav stack keeps earlier pages mounted and the last non-hidden `.ion-page` is not reliably the visible one - it reported step 1 while the device showed step 2. Anchoring on `document.elementFromPoint` at several probe points and taking the majority `.ion-page` is correct where "last" is not.
- **The hardware BACK key pops the page, not just the overlay.** Using it to close a modal repeatedly walked the app one screen further back than intended, and twice walked it out of the app entirely onto whatever the launcher showed. Close overlays with their own Cancel control, and guard every tap on `topResumedActivity` being `com.bitetribe.app` - a stray tap opened Samsung's Sleep mode editor.
- **The soft keyboard raises system dialogs of its own.** Samsung Keyboard's "Use Translation?" consent dialog swallowed taps until dismissed.
- **A search field keeps its previous query**; typing appends. Clear before retyping or the second search runs as `ChickenBern`.
- **`--skip-nx-cache` belongs in the charter's build step.** See the finding above.

## Not Executed

- **Ranking-change notification delivery.** `sendDailyLeaderboardNotification` is an `onSchedule` function that runs at 09:00 Europe/Zurich and diffs against yesterday's baseline. Forcing it would push notifications to **every** real user whose rank changed, so it was deliberately not triggered. The device half is armed: permission granted and an FCM token registered.
- **Deep link OS auto-verification.** `pm get-app-links` reports state 1024 for `bite-tribe.web.app`, because the debug signature `7A:9E:0E:9E…` is not among the two fingerprints in the published `assetlinks.json`. The server half was verified independently - the file is served at 200 with both release fingerprints - and the app's own handling passes warm and cold. Only the OS half needs a store-signed build.
- **The business app**, which needs its own build and was out of scope for this device run.
- **The Bitemap drawer's full drag** through its snap points, which synthetic input cannot reach; the drawer was opened by marker tap and its safe-area formula read from the DOM.
- **Check 3's upload failure and retry paths**, and **check 11's restaurant menu**, both verified by run 10 and not re-exercised here.

## Run 11 Outcome

**Release-candidate pass for the Android half.**

The run 10 blocker is cleared and all seven closed run 10 findings are verified fixed on hardware. Three new findings were filed and none blocks a release candidate: two are localisation or copy defects on secondary surfaces, and the third is a build-process trap rather than a product defect. Two checks are recorded as not executable rather than as passes, and the reasons are structural rather than incidental.

## Run 11 Cleanup Inventory

- **The test account is deleted.** `muhammed.gaygisiz@bitetribe.app` / uid `qqcOGO2bVvSBKLWC9GzsFPYCMIf1`, removed through the product's own deletion flow. Its Bite was deleted first, following run 10's lesson.
- **The App Check debug secret `f54c5836-59fc-465a-8a39-142586afbd62` is still allow-listed and still on this install.** Deleting the token cache does not disturb it. Keep it while this install stands.
- **Two orphaned local image directories remain**, `oVcIptzv…` from run 10 and `qqcOGO2b…` from run 11. See #1418.
- **Both geotagged fixtures remain** at `/sdcard/Pictures/run10-geotagged.jpg` and `run11-geotagged.jpg`, byte-identical, useful if the photo-location path is tested again.
- **115 legacy files remain in `/sdcard/Documents`** plus 3 directories, untouched and unreachable. See #1413.
- **The device is left signed out**, network restored, with location, notifications and media-location granted, and the app in English.

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

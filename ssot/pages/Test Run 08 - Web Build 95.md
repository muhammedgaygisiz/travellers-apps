# Test Run 08 - Web Build 95

## Purpose

Execution record for the release candidate test pass. Originally section "Web
Execution - Build 95 at `a20f485a` (Run 8)" of [[Current State - Release Candidate
Test Charter]], which owns the checks, the device matrix, and the pass criteria this
run was measured against.

## Summary

- Date: 17 Aug 2026
- Platform: Web
- Build: Deployed 1.0.1 (95), `develop` at `a20f485a`
- Device: Chrome, macOS

Run 8, web only. **All six Run 7 web findings verified fixed** — #1326, #1327, #1328, #1329, #1330, #1331 — plus #1325 and #1307, and #1334 which no run had checked. **Both Playwright suites executed for the first time in this charter**, serially and green: `bite-tribe-e2e` 39 passed, `bite-tribe-business-e2e` 1 passed. Registration, all seven onboarding steps taken down the **default** path, Bite creation and deletion with both toasts captured as objects, the three-step account deletion with its audit record, and the display-name reservation release all verified. **Result: pass for the web half**, no `P0` and no `P1` outstanding

Defects filed: Two filed, neither a blocker: [#1343](https://github.com/muhammedgaygisiz/travellers-apps/issues/1343) `P2`, the profile page's unfollow dialog is hardcoded English while the followers list translates the same dialog; [#1344](https://github.com/muhammedgaygisiz/travellers-apps/issues/1344) `P3`, the `My Bites` searchbar is flush left while the chip row above it is centred. The generic delete-account failure message was raised and **dismissed by decision** as intended anti-guessing behaviour

## Entry State And Build Identity

- **Run 8 is web only, by decision.** Its purpose was to re-run the web half against the fixes Run 7's findings produced, and to finish the surfaces Run 7 left unexecuted.
- **The build number does not distinguish this deploy from Run 7's, and that is structural.** The deployed app reads `version: "1.0.1", buildNumber: "95"` — the same identity string Run 7 tested — because `buildNumber` comes from the native projects and only moves at release prep. Between the two runs `develop` gained eight fix commits and CI redeployed. **A web run must therefore record the commit, not the build number.** This one is `a20f485a`.
- **The commit was established from the served assets rather than assumed.** The deployed `assets/i18n/en.json` is key-for-key and value-for-value identical to `develop` at `a20f485a`, including the three keys PR #1340 added, and CI for that commit deployed successfully on 15 Aug at 19:30.
- **The deployed bundle passes the production-cleanliness check, and the mechanism is worth stating precisely.** The inlined environment object in `chunk-6I76E3EN.js` carries no `NX_APP_BITE_TRIBE_IS_DEV`, no App Check debug token and no `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED`. Those three names **do** appear in `chunk-D3MU23YL.js`, as the runtime lookup keys the code reads them by (`u.NX_APP_BITE_TRIBE_IS_DEV !== "true"`), and `FIREBASE_APPCHECK_DEBUG_TOKEN` appears in the App Check SDK chunk as its own global. A future run greping for those strings will get hits; absence means absence **from the environment object**, which is the only place a value could live.

## Methodology Confirmed And Two New Techniques

- **Run 7's browser rule holds.** The whole run was driven by automation in an ordinary Chrome profile with no App Check trouble: `accounts:signUp`, `updateUserMetadata`, `syncEmailVerificationStatus`, `loadBitesByLocation` and Firestore `Listen` all succeeded under active server-side enforcement, with no 403 and no `appCheck/initial-throttle`. The instrumented browser remains the thing to avoid, not the automation.
- **New: `Set manually` is how the web half reaches a foreign Bite position.** Run 7 recorded #1307 as unreachable on web for want of any way to make the Bite position differ from the device position. The position-source modal's `Set manually` option is that way — zoom the modal map out (mouse-wheel events work where clicking `−` repeatedly is slow) and click another country. This unlocks the whole class of vacation-usage and posting-later edge cases the charter lists as never deliberately tested.
- **New: Storage can be listed from the signed-in page, with its own control in the same call.** `GET https://firebasestorage.googleapis.com/v0/b/<bucket>/o?prefix=images/bites/<id>/` with the user's `Authorization: Bearer <idToken>` **and** the SDK's App Check token from the `firebase-app-check-database` IndexedDB store. Run 7 had to recover a deleted Bite's id from the local gallery and read the console; this needs neither. Always pair the folder under test with a live Bite's folder in the same call, so "empty" is a result rather than a wrong path.
- **That attempt also produced unplanned App Check evidence.** The identical request _without_ the App Check header returns `401 Firebase App Check token is invalid`. Backend enforcement is therefore demonstrably live on **Storage**, not only on Firestore — a gap [[Current State - Known Issues]] listed as unevidenced. It still says nothing about the client-side enforced-mode gate, which needs a build with the flag on.

## The Six Run 7 Findings

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

## #1325 And #1307, Carried Over From The iOS Half

- **[#1325](https://github.com/muhammedgaygisiz/travellers-apps/issues/1325), the position marker's colour — fixed, with better evidence than either previous run produced.** The form's marker was read as a computed background colour per source: `From GPS` → `rgb(31,111,235)` (BLUE), `From restaurant` → `rgb(47,143,78)` (GREEN), `Set manually` → `rgb(124,58,237)` (PURPLE). The modal's legend dots match all five entries of `POSITION_SOURCE_COLORS` exactly, including `From photo` RED and `From Google` ORANGE. Run 7's diagnosis was that the form "does not read the source colour at all"; three sources now render three colours, and modal and form agree inside a single capture where Run 7 caught them disagreeing.
- **[#1307](https://github.com/muhammedgaygisiz/travellers-apps/issues/1307), restaurants sourced around the device — fixed, and reachable on web for the first time.** With the Bite positioned in Verona and the device in Bern, the restaurant picker offered **zero** Bern candidates and five Italian ones under `Nearby on Google Maps`, each labelled with **both** distances: `0.8 km from the Bite` and `323.3 km from you`. That is `getRestaurantsNearBite` emptying the 15 km local list and `hasRestaurantNearBite` correctly letting the Google lookup run. Stating both distances in the row is what makes the fix self-evidencing.
- **A charter check fell out of it that had never been exercised on web: the price currency prefill.** Moving the position to Italy flipped the form's currency from `Swiss Franc` to `Euro` immediately. The account default currency remains a separate check with a separate source; see [[issue-1262]].
- The resulting Bite deliberately paired a Bern restaurant with a Verona position, so its card read `JOHNY'S ROAD KITCHEN` above `PROVINCE OF VERONA, ITALY`. That mismatch is the fixture, not a defect.

## #1334, Which No Run Had Checked

- **[#1334](https://github.com/muhammedgaygisiz/travellers-apps/issues/1334) is fixed, and it was verified without altering the social graph.** The `Following` list holds **0** alerts across 51 rows with nothing pending. Clicking `Unfollow` on **row 2** opened exactly one alert reading `Are you sure you want to stop following @Abreham?` — the row clicked, not `@Zehraxkm`, the last row the pre-fix code would have unfollowed. `Cancel` left 51 rows intact and tore the alert down.
- Worth keeping as a method: a confirmation dialog's binding can be verified by reading the alert's `message` and then cancelling. Nothing destructive is needed to prove which row a dialog is bound to.

## Both Playwright Suites, Executed For The First Time

- Run 7 recorded the suites as not run. They were run here, serially, never overlapping, because they share the emulator ports.
- `npx nx e2e bite-tribe-e2e --workers=1` → **39 passed** in 4.8 minutes, exit 0.
- `npx nx e2e bite-tribe-business-e2e --workers=1` → **1 passed** in 20.1 seconds, exit 0. The business suite contains a single test, `opens a restaurant from the dashboard`, which is the measure of its coverage rather than a result to take comfort from.
- Neither needed manual setup: `playwright.config.ts` starts the emulators and the Angular dev server itself, and `apps/bite-tribe/.env` already carries the dev flags.

## Bite Lifecycle And Account Deletion

- **Both toasts were captured as live objects.** Create → `Bite created successfully!`, `color: "success"`, `position: "top"`. Delete → `Bite deleted successfully!`, same attributes. #1305's success path is now verified on two actions on two consecutive web builds.
- **[#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310) is bidirectional here too**: the profile Bite count read `1` after creation and `0` after deletion.
- The rating is the gate on `Post`: a photo, a dish name and a price left the button disabled.
- **Storage went with the explicitly deleted Bite.** `images/bites/4a1a7aea-…/` returned `items: 0` while a live feed Bite's folder returned `items: 1` in the same call. This corroborates Run 7's reading that Run 5's "Bite images are kept" observation belongs to the **account-deletion cascade**, where Bites are anonymised rather than removed, and not to an explicit Bite deletion.
- **A wrong password on the deletion re-auth proved a safety property that had only ever been asserted.** The attempt failed, and `accountDeletions/{uid}` was **404** afterwards: no job document, so the cascade never started. `assertRecentSignIn` throws before `deleteAccountForUser`, exactly as that function's comment claims — "a failure always leaves a signed-in user who can retry, never an orphaned data set nobody can reach".
- **The deletion audit record is worth reading after a deletion.** After the successful attempt, `accountDeletions/{uid}` held `status: completed`, an 8.1-second span, `deletedBucketlists: 1` and every other counter `0` — `anonymizedBites: 0` because the Bite had been deleted explicitly first. The document is a precise, self-consistent account of what the cascade touched, and it confirmed the bucket list went with the account as the deletion screen promised.
- **The display-name reservation is released, re-verified.** `displayNames/run8web` returned **404** after deletion, `users/{uid}` likewise, with the signed-in main account's own document returning 200 as the control.
- The three-step flow itself behaved as Run 7 documented, including the re-authentication prompt restating `run8web · muhammed.gaygisiz@bitetribe.app`.

## Findings

- **[#1343](https://github.com/muhammedgaygisiz/travellers-apps/issues/1343), `P2`: the profile page's unfollow dialog is hardcoded English.** `profile.component.html` builds `header="Stop following"` and its message as literals, while the followers list renders the same dialog through `'stop-following' | transloco`. Both keys exist and are translated in all eleven locales, and the component already uses Transloco five times elsewhere. A user in any of the other ten locales gets English from a profile page and their own language from the followers list. The hardcoded string also drops the `@` prefix the translated one applies.
- **Found only because #1334 was being verified.** Counting alerts on the `Following` page returned one more than expected; it belonged to the retained profile page behind it. The eager-alert pattern that #1327 and #1334 fixed has two remaining occurrences — `profile.component.html` and `edit-profile.page.html:145` — recorded on #1343 as a secondary point, since it is the same element.
- **[#1344](https://github.com/muhammedgaygisiz/travellers-apps/issues/1344), `P3`: the `My Bites` searchbar is flush left while the chip row above it is centred.** Noticed by the tester, then measured: `My Bites` reuses the home component whose desktop column widens to 1440px, so its capped 720px field sits at `x = 31`, while `My Bucket Lists` sits in its own 720px column and is centred. The stronger argument is within the page rather than between pages — the `Filter` / `Bitemap` / `Distance` chips directly above the field are centred. PR #1341 chose flush-left deliberately, to stay flush with the feed grid, so the issue records that it reverses a decision rather than fixing a slip.

## Raised And Dismissed By Decision

- **The generic failure message on a failed deletion re-auth is intended.** A wrong password produces `We could not delete your account. Please try again.`, the same string as an unknown backend failure; the service knows the difference internally and analytics records `reason: 'reauth_failed'`. Raised as a finding on the grounds that the anti-enumeration rationale does not apply on a screen that already names the account, and that Apple, Google and GitHub re-auth prompts do say the password is wrong. **Dismissed by the tester by decision**: the generic message is deliberate so that whoever is trying cannot confirm a guess, and the app has no specific credential-error copy anywhere — only `something-went-wrong-please-try-again` — so this is a consistent house pattern rather than a gap in one flow. "Please try again" is also correct advice for a wrong password. Recorded here because nothing documented the intent, which is exactly why it read as a defect.
- **A correction to how #1265 has been described.** [Issue #1265](https://github.com/muhammedgaygisiz/travellers-apps/issues/1265) is the mail sent by the **resend button**, through the Cloud Function and Gmail delegation. It is **not** the registration mail, which Firebase Auth's own template sends from `noreply@bitetribe.app` and which is fine. Registration in this run fired `sendOobCode` and so exercised the _correct_ sender path; that is not evidence about #1265. Retesting #1265 means triggering the resend button and reading that mail's `From` header.

## Web Outcome

- **Result: pass for the web half.** All six Run 7 web findings are verified fixed, #1325 and #1307 are verified on web, #1334 is verified for the first time, both Playwright suites are green, and no `P0` or `P1` finding is outstanding against the web app. The two new findings are `P2` and `P3`.
- **Every Run 7 fix held on first inspection.** That is worth stating because it is not the usual outcome in this charter: Run 5 caught #1232 closed-but-broken, and Run 6 refuted #1265's shipped fix. Eight fixes were checked here and none was refuted.
- **The two new findings came from the two methods this charter keeps arguing for, and again neither method would have found the other's.** #1344 came from the tester looking at the screen and asking why something seemed off. #1343 came from counting DOM elements and reading source — nobody driving the app in English could see it.
- **Still not executed on web**: anything behind a Business app login, **recorded as out of scope for Run 8 by decision**; the business app has a single Playwright test and no manual coverage. Safari has never been exercised on any run. The client-side App Check enforced-mode gate still needs a build with the flag on.
- **The web half's build identity problem is now recorded rather than latent.** Runs 7 and 8 both read `1.0.1 (95)`, and only the commit distinguishes them. Any future web row must carry the commit.

## Run 8 Cleanup Inventory

- **The `run8web` account was deleted at the end of the run**, by the tester, through the app's own three-step flow. Its display-name reservation is released and its user document is gone.
- **It created one Bite, `Run 8 Web Test Bite`**, positioned in Verona with a `RUN 8 WEB TEST / gallery scoping probe / delete me` placeholder image, and **deleted it before the account**. The profile count confirmed `0`, and the Storage folder `images/bites/4a1a7aea-fb4d-4ab7-bab6-bc4197373841/` was verified empty against a live Bite's folder as a control.
- **One bucket list, `Run 8 Search Fixture`**, went with the account: the deletion record reports `deletedBucketlists: 1`.
- **Nothing was posted to or about any other user.** The #1334 verification stopped at the confirmation dialog and cancelled, so no follow edge changed.
- **Two local-only residues remain in the tester's Chrome profile**, neither reachable by any account: the orphan `Documents/<run8web-uid>/` directory with its one photo, and the empty `Documents/<main-account-uid>/` directory created on sign-in. Run 7's 13 unowned root files are **gone**, deleted by #1328's fix during this run.

## Related Pages

- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]
- [[Current State - Known Issues]]

# Test Run 12 - iOS Simulator, Press And Release Epic

## Purpose

Acceptance record for epic [#1740] (press and release feedback), run for issue
[#1767] on 22 October 2026. It is not a release-candidate pass: it measures one
epic's behaviour against its child issues, not the charter in
[Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md).

**Result: every behaviour a simulator can show passed; how any of it feels in
the hand is still open.** No reference device was available. An iPhone 11 Pro
was paired but could not be signed for (below), so the run moved to the iOS
Simulator, where the Taptic Engine does not exist. What the run proves is
**which haptic intent fires on which touch, and what the surface does on
screen**, read off the native bridge, not what anyone felt.

## Summary

- Date: 22 Oct 2026
- Platform: iOS Simulator (iPhone 15 Pro), plus an Android compile with no
  device
- Build: local Debug, `develop` at `8de84790`, all of [#1743]-[#1749], [#1765]
  and [#1766] merged
- Backend: local Firebase emulators, test account `test@test.com`

## Entry State And Build Identity

| Property    | Value                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source      | `develop` at `8de84790` ([#1769] merged)                                                                                                                                                                                                                                                                                                       |
| Web bundle  | `NX_APP_BITE_TRIBE_IS_DEV=true npx nx build bite-tribe --configuration=development`, synced with `npm run cap:sync:ios`. A development bundle routes every Firebase SDK at the emulators on native (see [Implementation - iOS Simulator Testing](../implementation/ios-simulator-testing.md)), and the Simulator reaches the Mac's `localhost` |
| iOS wrapper | `xcodebuild -sdk iphonesimulator`, signing left on, as that page requires                                                                                                                                                                                                                                                                      |
| Device      | iPhone 15 Pro Simulator, location set to Munich, location permission granted with `simctl privacy`                                                                                                                                                                                                                                             |
| Account     | `test@test.com` from the emulator import; onboarding completed through the same Firestore patch `completeOnboardingIfNeeded` uses                                                                                                                                                                                                              |
| Evidence    | `xcrun simctl launch --console-pty`: a Debug build logs every bridge call as `To Native -> <Plugin> <method>`, so each `BiteHaptics` call is on record in order                                                                                                                                                                                |

**Why not the paired iPhone 11 Pro.** Xcode on the run machine has no account
for team `DJ2XQYP3NB`, so `-allowProvisioningUpdates` could not create a
development profile for `com.bitetribe.app`. Signing in is the owner's step and
was not taken during this run.

**Why not production.** App Check is enforced server-side, and a simulator only
passes it with a debug token registered in the console. Against the emulators
none is needed, and no production data was touched.

**The emulators were started without a functions build at first**, and the
functions emulator timed out loading the code, so the display-name check in
onboarding failed. `nx run bite-tribe-firebase:firebase-build` before
`firebase-serve` fixed it, which is what the e2e target's `dependsOn` already
does.

## Android Wrapper

Compiled for the first time, on a machine with no Android Studio:
`./gradlew :app:assembleDebug` succeeded, and `app-debug.apk` carries
`com/bitetribe/app/BiteHapticsPlugin`, its main-thread lambda,
`performHapticFeedback` and the `VIRTUAL_KEY` constants. The setup it took is
now under `Without Android Studio` in
[Implementation - Android Device Testing](../implementation/android-device-testing.md). No Android device was
available, so no Android behaviour was exercised.

## Checks

Every row was executed by a real touch on the Simulator, with the bridge log
read before and after.

| Issue   | Check                                                     | Bridge calls                                         | Result                    |
| ------- | --------------------------------------------------------- | ---------------------------------------------------- | ------------------------- |
| [#1743] | `BiteHaptics` is registered and used over the fallback    | every haptic below arrived as `BiteHaptics <intent>` | Pass                      |
| [#1744] | `ion-button` (Sign Up, Log In, Next, Got it)              | `press`, `release`                                   | Pass                      |
| [#1744] | `ion-back-button`                                         | `press`, `release`                                   | Pass                      |
| [#1744] | `ion-menu-button`                                         | `press`, `release`                                   | Pass                      |
| [#1744] | `ion-chip` (feed sort)                                    | `press`, `release`                                   | Pass                      |
| [#1744] | List row (search result `ion-item`)                       | `press` only                                         | Pass                      |
| [#1744] | Disabled `ion-button`                                     | none                                                 | Pass                      |
| [#1744] | Vertical scroll starting on a card                        | none                                                 | Pass - see note           |
| [#1745] | Card held under the finger                                | `press`, then `release` on lift                      | Pass - tinted, screenshot |
| [#1746] | Switching _Haptic Feedback_ off                           | `Preferences set`; no `BiteHaptics` afterwards       | Pass                      |
| [#1746] | Off survives a relaunch                                   | menu button after relaunch: none                     | Pass                      |
| [#1746] | On again                                                  | back button: `press`, `release`                      | Pass                      |
| [#1746] | Toggling does not dirty the account form                  | _Save preferences_ stayed disabled                   | Pass                      |
| [#1747] | Destructive alert, cancel (unfollow)                      | `press` only                                         | Pass                      |
| [#1747] | Destructive alert, confirm (unfollow)                     | `press`, `warning`; no `release`                     | Pass                      |
| [#1747] | Reaction option (switch 👍 to 🤤)                         | `press`, `selection`; no `release`                   | Pass                      |
| [#1748] | Finger drag from star 1 to star 4, several moves per star | `tick` × 4 (landing on 1, then 2, 3, 4)              | Pass - committed 4 stars  |
| [#1749] | Reaction pop                                              | -                                                    | Not observable - see note |
| [#1765] | Tap on the restaurant name opens the Bite                 | `press`, `release`; Bite opened                      | Pass                      |
| [#1765] | Interactive reaction chip opens its popover only          | `press`, `release`; popover, no navigation           | Pass                      |
| [#1765] | Read-only chip (own Bite) counts as the card              | `press`, `release`; Bite opened                      | Pass                      |
| [#1765] | _Rate now_ inside the card acts alone                     | `press`, `release`; rating modal, no navigation      | Pass                      |
| [#1765] | Sideways swipe across a feed card                         | `press`; no `release`, no navigation                 | Pass                      |
| [#1766] | Alert button visual press                                 | -                                                    | Not captured - see note   |

Notes on the rows that are not plain passes:

- **The scroll played no `press` either.** WebKit took the pan before
  delivering a `pointerdown` the listener counts, which is stricter than the
  contract asks for and costs nothing.
- **The reaction pop is 200 ms long**, shorter than a screenshot round trip, so
  it could not be caught. [#1749] verified it in Storybook against real Ionic.
- **The alert button's pressed tint** needs a screenshot during a held press on
  an alert, which this run did not take. [#1766] verified it in the real app in
  a browser and in Storybook.

## Findings

Two kinds of tappable element give no press at all. Neither contradicts the
contract, which names its surfaces, but both are taps with no feedback:

- **The app menu's entries.** `libs/common/ui/page/src/lib/menu/app-menu.component.html`
  renders them as `ion-item` with a `(click)` and no `button`, so the listener
  does not treat them as tappable rows. Opening Settings from the menu played
  nothing.
- **Options in an `ion-select` sheet.** Choosing _Date_ in the feed's sort
  sheet played nothing; those options are Ionic's own overlay buttons and are
  not among the press surfaces.

Neither is filed from this run; whether they should press is a product
decision for epic [#1740].

## Not Executed

- **Felt quality on the reference devices** (iPhone 17, Galaxy S26 Ultra):
  `selection` crisper than before, no intent weaker, the pop and the haptic
  reading as one event. The Simulator has no Taptic Engine. This is the part of
  [#1767] that stays open.
- **Android on a device**, including "no intent plays a waveform on API 30+".
  Compiled only.
- **A signed install on the paired iPhone 11 Pro**, blocked on the Xcode
  account above.

## Cleanup

The emulators import `.firebase-export` and do not export on exit, so the
reassigned Bite, the follow churn and the reaction changed nothing committed.
The iOS wrapper was re-synced with a production bundle afterwards, so no
development bundle is left in `ios/App/App/public`.

[#1740]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1740
[#1743]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1743
[#1744]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1744
[#1745]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1745
[#1746]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1746
[#1747]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1747
[#1748]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1748
[#1749]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1749
[#1765]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1765
[#1766]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1766
[#1767]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1767
[#1769]: https://github.com/muhammedgaygisiz/travellers-apps/pull/1769

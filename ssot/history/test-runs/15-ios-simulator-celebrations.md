# Test Run 15 - iOS Simulator, Milestone And Leaderboard Celebrations

## Purpose

Simulator pass for [Issue #2017][#2017], the acceptance of epic [#2012][#2012]
(Bite-count milestones and leaderboard top-ten celebrations), run on 16 November
2026 on the **iOS simulator** ahead of the reference-device run the issue asks
for. The maintainer asked to start with the simulator.

What is celebrated, and which moment wins, is owned by
`CelebrationService` in `libs/common/celebration` and by
`celebrateProfileProgress$` and `celebrateLeaderboardTopTen$` in
`libs/bite-tribe/store/src/lib/app/effects.ts`; the use case is
[UC - Use Gamification Signals](../../use-cases/uc-use-gamification-signals.md).

**Result: every row of the issue's checklist that a simulator can show passes.
How the grand burst feels, whether it drops frames, and the haptic in the hand
need the iPhone 17 and the Galaxy S26 Ultra, so that run is still owed. Android
was not run in this pass.**

## Summary

- Date: 16 Nov 2026
- Platform: iOS simulator
- Build: local debug build of `develop` at `4389f433`, every child of [#2012] merged ([#2013], [#2014], [#2015], [#2016])
- Device: iPhone 17 simulator, iOS 26.4
- Backend: the local Firebase emulators, development web bundle

Defects filed: none. The settling window and the grand-burst constants were not
changed: they can only be tuned by feel on hardware.

## Entry State And Build Identity

| Property    | Value                                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source      | `develop` at `4389f433`                                                                                                                                                            |
| Web bundle  | `NX_APP_BITE_TRIBE_IS_DEV=true npx nx build bite-tribe --configuration=development`, synced with `npm run cap:sync:ios`                                                            |
| iOS wrapper | `xcodebuild -sdk iphonesimulator` Debug with `BITETRIBE_APP_ICON=AppIcon-Dev`, signing left on                                                                                     |
| Backend     | `nx run bite-tribe-firebase:firebase-serve` from `.firebase-export`, so no QA or production data was touched and nothing was exported back                                         |
| Accounts    | `test@test.com` (Super Mario) and `test2@test.com` (Org A Employee) from the emulator import, onboarding completed with the same Firestore patch `completeOnboardingIfNeeded` uses |
| Leaderboard | ten public emulator-only accounts, Rival 01 to Rival 10, with 12 down to 3 Bites early in the week                                                                                 |
| Evidence    | `xcrun simctl launch --console-pty` bridge log, plus a simulator screenshot every 0.6 s for 12 s after each post                                                                   |

### How Each Row Was Driven

Bites were created in the emulator's Firestore with the Admin SDK, a few seconds
apart, so the real `incrementBiteCountOnBiteCreate` trigger counted them and
rebuilt `/meta/leaderboardWeekly`, and the app reacted to the snapshots exactly
as it does to a post from the UI. `biteCount` was set just below each milestone
directly on the user document, and `public` and `countryCodes` likewise; a new
country was added to `countryCodes` together with its Bite, as the backend does.

Each celebration is on record three ways: one `FirebaseAnalytics logEvent`
(`celebration_shown`), one `BiteSounds celebration` and one
`BiteHaptics success` on the bridge, and the toast and confetti in the frames.
"Plays nothing" means none of those three calls and no toast in 12 s. Every
celebration appeared about 4 s after the post: the trigger, then the 3 s
settling window.

## Checks

| Case       | Check                                                     | Result                                                                                                                       |
| ---------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Milestone  | 5th, 10th, 50th, 100th, 200th Bite                        | **Pass.** One sound, one haptic, one standard burst and "N Bites! That's a lot of good food." for each                       |
| Milestone  | 6th Bite                                                  | **Pass.** Nothing                                                                                                            |
| Thousand   | 1,000th and 2,000th Bite                                  | **Pass.** Grand burst from both corners and the centre with 🍜🍕🌮🍣, "1,000 Bites! You're a true foodie legend."            |
| Thousand   | A tap during the grand burst reaches the control under it | **Pass.** Search tapped about 1 s into the 2,000th burst: `BiteHaptics press`, Search opened, the burst kept running over it |
| Thousand   | No visible dropped frames                                 | **Not executable.** Needs the reference devices                                                                              |
| Top ten    | A public user entering the top ten                        | **Pass.** Org A Employee from 11th to 10th: one celebration, "You're in the top ten, at #10!"                                |
| Top ten    | A private user never does                                 | **Pass.** Super Mario, private, to 13 Bites this week, more than #1: not listed, nothing played                              |
| Overtake   | Passing a user names them                                 | **Pass.** "You passed Rival 01 and are now #1!"; later "You passed Rival 06 and are now #7!"                                 |
| Overtake   | A tie plays nothing                                       | **Pass.** Twice, Super Mario level with Rival 01 at 15 and at 17: the earlier one stays above, nothing played                |
| Overtake   | The passed user sees nothing                              | **Pass.** Signed in as Super Mario while Rival 01 passed from 12 to 15: nothing                                              |
| Precedence | One post that is a milestone and a top-ten entry          | **Pass.** Super Mario's 2,100th Bite also entered at #1: one celebration, the milestone's                                    |
| Precedence | One post that is a first country and a pass               | **Pass.** A Bite in Japan that passed Rival 01: one celebration, "First Bite in a new country: Japan!"                       |
| All        | Reduce Motion draws nothing and keeps the toast           | **Pass.** iOS Reduce Motion on, 50th and 1,000th Bite: toast, sound and haptic, no canvas, standard or grand                 |
| All        | Haptics off keeps burst and toast                         | **Pass.** Haptic Feedback off in Settings: burst, toast and sound, no `BiteHaptics success`                                  |

## Observations

Neither is a defect, and neither is filed.

- **A milestone reached while the app was closed is celebrated at the next
  launch.** Setting `biteCount` from 200 to 999 with the app closed played
  "900 Bites!" on launch. That is the documented behaviour of
  `celebrateProfileProgress$`; on a device it would only show after Bites
  posted from another device.
- **The toast and burst draw above the first-run coach marks.** On a freshly
  signed-in account the top-ten toast and its confetti appeared over the
  "Explore BiteTribe" tip. The canvas is meant to sit above every overlay; the
  tip stayed usable.

## Not Executable On A Simulator

- **Feel and timing.** Whether the 3 s settling window feels like one reaction
  to the post, and whether the grand burst is the right size. The constants
  stay as shipped until the device run.
- **Dropped frames** in the grand burst. The simulator renders on the Mac.
- **The haptic itself.** The simulator has no Taptic Engine; the bridge call is
  what was checked.
- **Android.** Not run in this pass.

## Cleanup

The emulators import `.firebase-export` and do not export on exit, so the
seeded rivals, Bites and counts are gone when they stop. Reduce Motion was
switched off and Haptic Feedback back on. The iOS wrapper still holds the
development bundle from this run; re-sync with a production bundle before any
release build.

[#2012]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2012
[#2013]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2013
[#2014]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2014
[#2015]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2015
[#2016]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2016
[#2017]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2017

Part of [Test Runs](README.md).

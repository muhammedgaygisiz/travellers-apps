# Test Run 12 - Sounds, Simulators

## Purpose

Execution record for [Issue #1847][#1847], the acceptance of the sounds of
[Epic #1742][#1742], run on 14 November 2026 on the **iOS simulator and the
Android emulator** rather than on the two reference devices the issue names.
Neither the iPhone 17 nor the Galaxy S26 Ultra was connected, and the
maintainer asked for the run on the simulators.

The checklist is the issue's. What plays, when, and through which native path
is owned by the Sound Rule in [Architecture - Capacitor](../../architecture/capacitor.md#sound-rule);
where the files come from and how loud they are is owned by `Bundled Audio` in
[Implementation - Store Listing Assets](../../implementation/store-listing-assets.md#bundled-audio).

**Result: every row a simulator can execute passes on both platforms. The rows
that need a human at a table - the feel of sound, haptic and toast together,
loudness in a quiet room, the iOS ring/silent switch, and music from another
app - are recorded as not executable here, so the reference-device run is still
owed.**

## Summary

- Date: 14 Nov 2026
- Platforms: iOS simulator, Android emulator
- Build: local debug builds of `develop` at `b58e0969`, every child of [#1742] merged
- Devices: iPhone 17 simulator, iOS 26.4; Pixel 7 emulator, Android 16 (SDK 36)
- Backend: the local Firebase emulators, development web bundle

Defects filed: none.

## Entry State And Build Identity

| Property   | Value                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | `develop` at `b58e0969`, the merge of [#1846]                                                                                                 |
| Web bundle | `npx nx build bite-tribe --configuration=development`, synced with `cap:sync:ios` and `bite-tribe-android:sync`; the sync left no native diff |
| iOS        | `xcodebuild` Debug for the simulator with `BITETRIBE_APP_ICON=AppIcon-Dev`, signing left on                                                   |
| Android    | `./gradlew assembleDebug` with the Android Studio JBR 21, `app-debug.apk`                                                                     |
| Backend    | `nx run bite-tribe-firebase:firebase-serve`, so App Check never applied and no QA or production data was touched                              |
| Account    | one fresh emulator account on iOS, signed up and onboarded in the run; the Android emulator kept an emulator account from an earlier session  |
| Location   | the iOS simulator fixed at Munich, 48.1374 / 11.5755                                                                                          |

### How Each Row Was Observed

Three independent views, so a row never rests on the JavaScript alone:

- **The web layer.** A recorder injected into the WebView, through the WebKit
  inspector socket on iOS and DevTools on Android, wrapped
  `Capacitor.nativePromise` and timestamped every `BiteSounds` and
  `BiteHaptics` call, every `ion-toast` and every confetti `canvas`.
- **The bridge.** The debug Capacitor bridge logs every `To Native` call,
  read from the app's console on iOS and from `logcat` on Android.
- **The platform audio service.** On iOS, `systemsoundserver-simd` logs
  `Starting audio : actionID …` for every system sound it plays, with the
  client's audio session. On Android, `dumpsys audio` lists the app's
  `SoundPool` player, its attributes and every `event:started`.

Where a moment was hard to reach on a fresh emulator account, such as a first
follow, `CelebrationService` and `SoundsService` were called directly through
Angular's development-mode injector. The call sites themselves were driven
through the UI for onboarding, a first Bite and a later Bite.

## Checks

| Case             | iOS simulator                                                                                                                                                 | Android emulator                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Bite posted      | **Pass.** A second Bite: `success` haptic and `posted` in the same millisecond, toast added 1 ms later and fully in 425 ms later. Played as actionID 4097     | **Pass** for the sound path: `posted` reaches the `SoundPool` player, which logs `event:started`                           |
| First Bite       | **Pass.** Only `celebration`, with haptic, confetti and "Your first Bite is in!" in the same millisecond. No `posted` call at all                             | Not re-run: the account already had Bites                                                                                  |
| Each other first | **Pass.** Finishing onboarding: `celebration`, haptic, confetti and "Welcome to the tribe!" within 1 ms. Under Reduce Motion: no canvas, sound kept           | **Pass.** A celebration plays once with its burst                                                                          |
| Silent mode      | **Not executable.** The simulator has no ring/silent switch                                                                                                   | **Pass.** Vibrate, silent and priority-only DND with the ringer on normal: no `event:started`, the haptic fires every time |
| Music            | **Partial.** All 9 plays reached the sound server with `inClientAudioSessionID 0`, and the app logged no audio-session activity. No music app to play against | **Partial.** The audio focus stack stayed empty and no player was ducked. No music app to play against                     |
| Switch           | **Pass.** The settings toggle wrote `sounds-enabled=false`; nothing reached `BiteSounds`, haptic, confetti and toast unchanged; still off after a restart     | **Pass.** With sounds off nothing reaches `BiteSounds`; the haptic still fires                                             |
| Loudness         | **Not executable at the table.** Measured against the iOS notification sounds instead, below                                                                  | Not executable                                                                                                             |
| Stacking         | **Pass.** `posted` then a celebration 40 ms later: one sound. Two celebrations together: one sound. Sounds 350 ms apart: both play                            | **Pass.** `posted` then a celebration 40 ms later: one `event:started`                                                     |

### Native Evidence

On iOS the system sound server started a sound 1 to 2 ms after each bridge
call. `posted.caf` always played as actionID 4097 and `celebration.caf` as 4098,
a mono 44.1 kHz 16-bit file converted to float on the way out. There were 9 plays
in the run, the same as the 9 `BiteSounds` calls the recorder saw. The first play
after launch took about 130 ms more while the simulator built its output device;
later plays did not.

On Android the app's player is `type:android.media.SoundPool` with
`usage=USAGE_ASSISTANCE_SONIFICATION content=CONTENT_TYPE_SONIFICATION`, so it
plays on the system stream. Turning Do Not Disturb fully on also switches the
ringer to silent, so the DND rows were repeated with the ringer forced back to
normal to test the interruption-filter check on its own.

## Loudness Against The Notification Sounds

Both files were measured next to iOS's own notification sounds from the iOS 26.4
simulator runtime. All of them play through System Sound Services at the same
system volume, so the file level is the comparison. The loudest 50 ms window
stands in for how loud a short sound seems.

| Sound                 | Length  | Peak       | Loudest 50 ms RMS | Whole-file RMS |
| --------------------- | ------- | ---------- | ----------------- | -------------- |
| `posted`              | 235 ms  | -13.0 dBFS | -30.6 dBFS        | -33.7 dBFS     |
| `celebration`         | 271 ms  | -16.0 dBFS | -29.3 dBFS        | -34.1 dBFS     |
| `ReceivedMessage`     | 518 ms  | -13.1 dBFS | -17.2 dBFS        | -22.2 dBFS     |
| `sms-received1`       | 900 ms  | -14.0 dBFS | -20.8 dBFS        | -27.6 dBFS     |
| `health_notification` | 1792 ms | -12.7 dBFS | -24.0 dBFS        | -34.2 dBFS     |
| `new-mail`            | 1500 ms | -18.7 dBFS | -25.5 dBFS        | -34.4 dBFS     |

Both sounds are **4 to 13 dB softer** than every notification sound in their
loudest moment, and far shorter. The issue's limits of 300 ms and -12 dBFS hold.

**Observation, not a defect.** `Bundled Audio` places `celebration` 3 dB below
`posted`. That holds for the peak. By short-term RMS the two are within about
1 dB of each other, and `celebration` is the louder of the two in its loudest
50 ms. They sound about equally loud, not one clearly softer than the other. The
ear check on the reference devices decides whether `celebration` needs a
re-master.

## Not Executable On A Simulator

- **How it feels.** Whether `posted`, the `success` haptic and the toast feel like
  one event. They fire in the same millisecond and the toast finishes sliding in
  about 430 ms later; the simulators play no haptic.
- **Loudness in a quiet room** at default volume, against a real notification.
- **The iOS ring/silent switch.**
- **Music from another app.** Neither simulator had a music player. The
  mechanism was checked instead: no audio session on iOS, no audio focus on
  Android.
- **Android vibrate and silent on Samsung's One UI.** The emulator runs stock
  Android.

## Environment Notes

- The iPhone 17 simulator's text input lagged behind taps and doubled pasted
  text, so forms were filled through the WebView instead.
- The native Firestore SDK on iOS stalled once on a read after the emulator
  closed its gRPC connection with `too_many_pings`. A relaunch cleared it, and it
  is an emulator artefact, not part of the sound path.
- The Pixel 7 emulator ran on software rendering and showed an "isn't
  responding" dialog during start-up. One confetti burst did not end before the
  next celebration, so that celebration drew no second burst, and its canvas was
  still in the page more than a minute later with the page visible. On software
  rendering that is most likely starved animation frames; the reference-device
  run should still watch that a burst always clears. `adb` stopped responding
  near the end of the run. Neither touches the sound rows above.

[#1742]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1742
[#1846]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1846
[#1847]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1847

Part of [Test Runs](README.md).

# Test Run 13 - Sounds, Devices

## Purpose

Execution record for [Issue #1847][#1847], the acceptance of the sounds of
[Epic #1742][#1742], run on 15 November 2026 on **two physical phones**. It
covers what [Test Run 12](12-sounds-simulators.md) left to the devices: how
sound, haptic and toast feel together, loudness in a room, the iOS ring/silent
switch, music from another app, and Samsung's One UI.

The issue names an iPhone 17 and a Galaxy S26 Ultra. Neither was available, so
the run used the maintainer's own phones, a **Galaxy A56** and an **iPhone 12
mini**. Both run the platform path the Sound Rule in
[Architecture - Capacitor](../../architecture/capacitor.md#sound-rule) describes, and
the A56 runs One UI, which is what the emulator could not stand in for.

**Result: every row passes on the Galaxy A56. On the iPhone 12 mini every row
passes except Loudness, which fails narrowly: `posted` sounded at best slightly
softer than the iOS text tone, not clearly softer. The maintainer judged that
good enough to ship and accepted the sounds as they are, with no re-master and
no defect filed.**

## Summary

- Date: 15 Nov 2026
- Platforms: Android, iOS
- Build: debug builds of `develop` at `f905df8e`, every child of [#1742] merged, plus the bite milestones of [#2014]
- Devices: Galaxy A56 (SM-A566B, One UI); iPhone 12 mini, iOS 26.6.2
- Backend: the local Firebase emulators, development web bundle over live reload

Defects filed: none. The iOS loudness row was accepted by the maintainer as
good enough to ship.

## Entry State And Build Identity

| Property   | Value                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | `develop` at `f905df8e`, the merge of [#2014]                                                                                                                        |
| Web bundle | `nx serve bite-tribe` on the Mac's LAN address, loaded by both apps through Capacitor live reload (`cap run <platform> -l --host <LAN address>`)                     |
| Android    | debug APK from `cap run android -l`, installed with `adb install` after the Play Store build was uninstalled                                                         |
| iOS        | Debug build from `cap run ios -l`, installed with `devicectl` over the App Store build; console attached with `devicectl device process launch --console`            |
| Backend    | `nx firebase-serve bite-tribe-firebase` with every emulator bound to `0.0.0.0` for the run only, so the phones reach it over Wi-Fi; no QA or production data touched |
| Accounts   | one fresh emulator account per phone, signed up and onboarded in the run                                                                                             |
| Settings   | Android: ringer on Sound, system volume 6/15, notification volume 11/15. iOS: ring/silent switch on ring, maintainer's own Ringtone and Alerts level                 |

### How Each Row Was Observed

- **By ear and by hand.** The maintainer held each phone, listened and felt
  the haptic for every row.
- **The app's calls.** On Android, a recorder injected into the WebView over
  DevTools timestamped every `BiteSounds` and `BiteHaptics` call, every
  `ion-toast` and every confetti `canvas`. On iOS, the Capacitor bridge log on
  the attached console showed every `To Native` call in order.
- **What Android played.** `dumpsys audio` named the app's `SoundPool` player
  and logged every `event:started`, the ducked-player list and the audio focus
  stack. iOS offers no equivalent from a Mac without extra tooling, so iOS rows
  rest on the ear and the bridge log.

On Android the Bite form was filled through Angular's development-mode hooks,
with a drawn photo, and posted with a real tap on **Post**; the native photo
picker cannot be driven over `adb`. On iOS the maintainer filled and posted
every Bite by hand.

## Checks

| Case             | Galaxy A56                                                                                                                                            | iPhone 12 mini                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Bite posted      | **Pass.** `success` haptic and `posted` in the same millisecond, toast 2 ms later, one `event:started`; felt as one event                             | **Pass.** `success` haptic and `posted` back to back on the bridge; felt as one event                                                   |
| First Bite       | **Pass.** Only `celebration`, with haptic, confetti and "Your first Bite is in!" within 2 ms; no `posted` call                                        | **Pass.** Only `celebration` and the haptic on the bridge; heard only `celebration`                                                     |
| Each other first | **Pass.** Finishing onboarding: confetti, `celebration` and haptic in the same millisecond, toast 10 ms later; the canvas was gone 4 s later          | **Pass** on the second account. The first onboarding sent `celebration` and was not heard; the ringer setting was the cause, see below  |
| Silent mode      | **Pass.** Vibrate (ringer mode 1), Mute (0) and Do Not Disturb with the ringer on Sound: no `event:started`, the haptic felt every time               | **Pass.** Ring/silent switch on silent: `posted` sent, nothing heard, haptic felt                                                       |
| Music            | **Pass.** Apple Music kept its player `started`, the ducked-player list stayed empty, the app made no audio focus request; heard playing on unchanged | **Pass.** Apple Music kept playing at its volume under `posted`                                                                         |
| Switch           | **Pass.** Sounds off, force-stop and relaunch: `sounds-enabled` still `false`, no `BiteSounds` call, haptic and toast unchanged                       | **Pass.** Sounds off, relaunch: read back `false`; the 5th Bite made no `BiteSounds` call, both haptics and the milestone confetti came |
| Loudness         | **Pass.** Both sounds clearly softer than the phone's notification tone, Brightline, previewed at notification volume                                 | **Fail, narrowly.** `posted` at best slightly softer than the text tone previewed in Settings, not clearly softer                       |
| Stacking         | **Pass.** `posted` then `celebration` 40 ms apart through `SoundsService`: only `posted` reached the plugin, one `event:started`, one sound heard     | **Not executed.** No WebView inspector to call the service; the dedupe is shared JavaScript, passed here and in [Test Run 12]           |

## Loudness By Platform

The two platforms reach the same verdict on the same files for different
reasons.

- **Android** plays the sounds on the system stream, which on the A56 sat at
  6 of 15 while notifications sat at 11 of 15. The stream gap does most of the
  work, so the sounds are clearly softer.
- **iOS** plays them through System Sound Services at the same Ringtone and
  Alerts volume as the text tone. Only the files' own level separates them, and
  `posted` peaks at -13 dBFS, as high as iOS's own `ReceivedMessage`. Test Run
  12 measured it 4 to 13 dB softer by short-term RMS; by ear on the device that
  was not enough.

**Decision: shipped as is.** The maintainer judged "slightly softer" good
enough for a dining room and kept the levels. Should that change, the lever is
a re-master of both masters by a few dB, owned by `Bundled Audio` in
[Implementation - Store Listing Assets](../../implementation/store-listing-assets.md#bundled-audio).
Both platforms ship the same masters, so Android would become softer as well
and both phones would need the ear check again.

## Observations

- **A milestone Bite makes two sounds.** The 5th Bite played `posted` at once
  and the milestone `celebration` 4.4 s later. [#2014] reads the milestone from
  `biteCount`, which a Cloud Function sets seconds after the post, so the two
  never land inside the 300 ms stacking window. Whether two sounds for one post
  is right belongs to [Epic #2012][#2012], not to this run.
- **iOS sounds follow the ringer, not media volume.** The first iOS
  onboarding sent `celebration` and nothing was heard. The maintainer then
  found the ring/silent switch or the Ringtone and Alerts level set so the
  sound could not play, changed it, and every later row was heard. That is the
  Sound Rule working, but it is easy to mistake for a missing sound: the side
  buttons change media volume, not this one.

## Environment Notes

None of these touches the sound path, but each cost time and will recur on the
next device run against the emulators.

- **Physical phones need the emulators on the network.** A packaged native
  build keeps `localhost` for the emulators, which on a phone is the phone.
  Live reload makes `resolveEmulatorHost` use the Mac's LAN address, and the
  emulators have to listen on `0.0.0.0`, which `firebase.json` does not set.
  The phone has to be on the same Wi-Fi.
- **A worktree with a symlinked `node_modules`** breaks `pod install`: the
  generated pod paths resolve through the symlink and the two hand-written
  subspec lines in the `Podfile` do not. The run edited those two lines locally.
  A Gradle build also needs `local.properties` copied in.
- **Installing over the store app keeps its data on iOS.** The keychain held
  the maintainer's production Google session, which the Auth emulator answered
  with `INVALID_REFRESH_TOKEN`, so **Create Bite** did nothing until a sign-out.
  The app's Firestore cache, keyed by the same `bite-tribe` project id, showed
  production Bites until the app was deleted and reinstalled.
- **Storage download URLs point at `127.0.0.1:9199`.** Bite photos uploaded in
  the run never loaded on the phones.
- **A live-reload page reload crashes the iOS app.** When the Vite connection
  dropped and the page reloaded, `FirebaseStorage.useEmulator` ran a second
  time and the native SDK stopped the app with a fatal error. A store build
  never calls `useEmulator`.
- **Samsung's Auto Blocker** refuses `adb install` with no reason given; it was
  turned off for the run. The Play Store build has to be uninstalled first, as
  the debug build is signed differently.
- **The Android page reloaded while in the background** after Do Not Disturb
  was set from Settings, and the WebView did not answer DevTools while hidden.

[#1742]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1742
[#1847]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1847
[#2012]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2012
[#2014]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2014
[Test Run 12]: 12-sounds-simulators.md

Part of [Test Runs](README.md).

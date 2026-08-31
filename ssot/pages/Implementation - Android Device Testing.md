# Implementation - Android Device Testing

## Purpose

Android device testing records how to get a branch build of `bite-tribe` onto a
physical Android device and how to inspect it while it runs.

It exists because the Angular 22 device validation in [[issue-1037]] needed
every step below and none of them was written down. The App Check debug secret
in particular blocks the first launch of any fresh install, and the failure it
produces looks like a product bug rather than a setup step.

This is not [[Implementation - Store Release Steps]]. That page owns signed
release artifacts for TestFlight and Play. This page owns a debug build on a
device you are holding, used to validate a branch before it merges.

## Prerequisites

| Requirement            | Value                                               |
| ---------------------- | --------------------------------------------------- |
| `adb`                  | `~/Library/Android/sdk/platform-tools/adb`          |
| JDK                    | 21 — see below, this is the step that fails first   |
| Node                   | the version in `.nvmrc`                             |
| `apps/bite-tribe/.env` | must exist; it is gitignored                        |
| Device                 | USB debugging on, and USB mode set to data transfer |

Set the USB mode deliberately. A device left on "charging only" still shows in
`adb devices` at first and then drops the connection partway through a session,
which kills any running `adb` stream. Recover with `adb kill-server && adb
start-server`; the app process itself survives.

### JDK 21

Gradle needs a JDK 21 toolchain. A Homebrew JDK 25 default fails during
configuration with `Cannot find a Java installation on your machine ... matching:
{languageVersion=21}`. Android Studio ships a JBR at exactly 21:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

`tools/build-android-release.mjs` resolves a usable JDK by itself, which is why
[[Implementation - Store Release Steps]] needs no export. The debug `:run` path
used here has no such resolver, so the export is required.

### The env file

`apps/bite-tribe/.env` carries the Firebase configuration. A production build
strips `NX_APP_BITE_TRIBE_IS_DEV` and `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN`
from the bundle, so a production device build genuinely runs against production
Firebase under App Check enforcement. To confirm that on a built bundle, read the
inlined `process.env` object out of `dist/apps/bite-tribe`.

## Build, Sync, Install

```bash
NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production
npx nx run bite-tribe-android:sync
npx nx run bite-tribe-android:run
```

Use `nx run bite-tribe-android:sync`. A bare `nx sync` is Nx's workspace
sync-generator and never touches Capacitor.

`cap run android` prompts for a target when more than one device is attached.
Pass the serial from `adb devices` to skip the prompt:

```bash
npx nx run bite-tribe-android:run --cmd="run android --target <serial>"
```

The native wrapper bundles `dist/apps/bite-tribe`, so an unsynced wrapper
installs the previous build's web assets with no visible error. After a sync,
check that `apps/bite-tribe-android/android/app/src/main/assets/public/` holds
the `main-*.js` hash you just built.

A version-only move inside the Capacitor 8 family should produce **no** committed
native diff, the rule issue #1038 established. Anything appearing under
`apps/bite-tribe-android/android/` after a sync is a finding, not noise.

## App Check Debug Secret

**A fresh install cannot reach past the startup gate until this is done.** The
debug variant installs `DebugAppCheckProviderFactory` — Play Integrity cannot
issue a token for a locally signed build — and that provider's secret has to be
allow-listed in the Firebase console before the build can read production data.

Until it is, App Check returns `403 App attestation failed`, and with enforcement
on, the gate from issue #933 correctly blocks the whole app behind its retry
screen. That is the gate working, not a defect.

Read the secret from logcat after the first launch:

```bash
adb logcat -d | grep -i "debug secret"
```

Register it in the Firebase console under **App Check → Apps → the Android app →
Manage debug tokens**, then force-stop and relaunch. A fresh install regenerates
the secret, so this repeats whenever the app is uninstalled or installed on a new
device; installing over an existing install keeps it.

## Inspecting A Running Build

Screenshots and logs need nothing special:

```bash
adb exec-out screencap -p > screen.png
adb logcat -d
```

Prefer `adb logcat -d` dumps over a long-lived `adb logcat` stream. The stream
does not survive USB renegotiation and dies with exit code 255 partway through a
session.

A debug build is debuggable, so the WebView exposes a DevTools socket and can be
driven over CDP — which is how the Transloco transport was proved in
[[issue-1037]] rather than inferred from the rendered text:

```bash
adb forward tcp:9222 localabstract:webview_devtools_remote_$(adb shell pidof com.bitetribe.app | tr -d '\r')
curl -s http://localhost:9222/json/list
```

Three things about that connection are worth knowing before losing time to them:

- `window.ng` is **absent** in a production bundle, so the Angular debug utilities
  are not available. Reach application state through the DOM or through the
  Capacitor bridge instead.
- Node's built-in `fetch` fails against the adb-forwarded DevTools HTTP endpoint,
  and so does `chrome-remote-interface`'s own target listing. Read `/json/list`
  with `curl` and open the returned `webSocketDebuggerUrl` directly with `ws`.
- The forward is bound to a process id, so it has to be re-established after every
  app restart.

`window.Capacitor.Plugins` is available and is the practical way to put the app
into a given state. `Preferences` holds the active language under `lang` and the
dismissed coach marks under `coach-marks-seen:<userId>`, both of which are useful
for setting up a check:

```js
await window.Capacitor.Plugins.Preferences.set({ key: 'lang', value: 'de' });
```

A `Preferences` write can be lost if the app is force-stopped immediately after
it, because the underlying `SharedPreferences` commit is asynchronous. Send the
app to the background first, then force-stop.

## Release Builds

A release build is **not debuggable**: `apps/bite-tribe-android/android/app/build.gradle`
sets no `debuggable true` on the `release` buildType. There is therefore no
`webview_devtools_remote` socket, no `chrome://inspect`, and the release WebView
forwards no JS console output to logcat. Everything in the CDP section above is
unavailable, so a release-build investigation is driven from outside the app:

- **Read the UI with screenshots.** `adb exec-out screencap -p` plus `adb shell
input tap` / `input swipe` reads state that logcat cannot show — whether a
  submit button is greyed out, which validation message is rendered.
- **`adb shell dumpsys package com.bitetribe.app`** gives requested versus
  granted runtime permissions, `versionCode`, and install and update times. This
  is the fastest way to confirm which build is actually on the device.
- **`adb shell dumpsys webviewupdate`** gives the real WebView provider and
  version. Check it before blaming an old browser: a stale
  `com.google.android.webview` can be disabled with Chrome serving as the actual
  provider, and the two render differently.
- **Probe native pipelines through their side effects on disk**, since no
  in-page instrumentation is available.

Reinstalling resets every runtime grant, so a reinstalled build prompts for
permissions where the original never did. Keep that in mind when a permission
dialog appears that the reporter never saw.

## Gotchas

- **Coach marks** cover most first-run screens and advance one per dismissal.
  Writing the full `CoachMarkSurface` list into `coach-marks-seen:<userId>` and
  reloading clears them in one step.
- **Distance bindings** render `-` until location permission is granted, so a
  check that depends on real distances needs the permission granted first.
- **Two `403`s are expected** in the WebView log, from `firebase.googleapis.com`
  and `firebaseinstallations.googleapis.com`, reading `Requests from referer
https://localhost/ are blocked`. The Firebase web API key's HTTP-referrer
  restriction does not cover the Capacitor origin. Analytics falls back to the
  local measurement id; Installations fails outright, which is what FCM
  registration depends on.
- **Leaflet markers paint here** even though they never do in Loki's Docker
  Chrome, so the device is the place to confirm map rendering.

## Related Pages

- [[Implementation - iOS Simulator Testing]]
- [[Implementation - Store Release Steps]]
- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release State]]
- [[Current State - Release Candidate Test Charter]]

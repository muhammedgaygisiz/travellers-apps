# Implementation - iOS Simulator Testing

## Purpose

How to run BiteTribe on an iOS simulator against the **production** Firebase
project, which is what capture sessions, layout checks and reproduction work
need. The Android counterpart is [[Implementation - Android Device Testing]].

A simulator is not a substitute for a device. The release-candidate charter is
explicit that simulators do not count for permissions, notifications, camera or
App Check attestation; see
[[Current State - Release Candidate Test Charter]]. Use this for layout, for
content capture, and for reproducing something a device already showed.

## Prerequisites

### The env file

`apps/bite-tribe/.env` carries the **real** Firebase configuration and is
gitignored. The repository-root `.env` carries dummies and points nowhere
useful, so a build made with it will start and then fail at the first Firebase
call. Check which one is in play before blaming the app.

### A simulator

```bash
xcrun simctl list devices available | grep -i ipad
xcrun simctl boot "iPad Pro 13-inch (M5)"
```

Any iPhone entry works the same way. The 13-inch iPad is called out because its
native capture size, 2064 x 2752, is exactly the slot App Store Connect demands
for 13-inch displays.

## Build And Run

The web assets already synced into `apps/bite-tribe-ios/ios/App/App/public`
are whatever the last sync put there. Re-sync first when the web layer matters:

```bash
npx nx build bite-tribe   # production build: real config, dev keys stripped
npm run cap:sync:ios      # the UTF-8-safe sync; see Architecture - Capacitor
```

Then build the wrapper for the booted simulator:

```bash
xcodebuild -workspace apps/bite-tribe-ios/ios/App/App.xcworkspace \
  -scheme App -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=<UDID>' \
  -derivedDataPath /tmp/bt-ios build
```

Install and launch the `.app` from
`<derivedDataPath>/Build/Products/Debug-iphonesimulator/App.app`.

### Never Pass `CODE_SIGNING_ALLOWED=NO`

It builds faster and it breaks authentication in a way that looks like
something else entirely. Without code signing the binary carries no
keychain-access-group entitlement, so App Check cannot persist its token:

```text
[FirebaseAuth] Error getting App Check token; using placeholder token instead.
Error: com.google.app_check_core Code=3 "Keychain access error."
  SecItemCopyMatching (-34018)
→ identitytoolkit response_status=401
```

`-34018` is `errSecMissingEntitlement`. Firebase falls back to a **placeholder**
App Check token, the backend refuses it, and the app shows
`Something went wrong. Please try again.` on the login screen. Nothing in the UI
mentions attestation, the debug token looks correctly registered, and the
account is fine. Found on 31 August 2026 after exactly that misdiagnosis.

A plain `xcodebuild ... build` with signing left on is the fix. It is slower and
it works.

## App Check Debug Token

App Attest has no simulator implementation, and App Check is enforced
server-side on Authentication, Firestore and Storage. So a simulator obtains no
token and cannot sign in - **disabling the client-side enforced gate does not
help**, because the refusal is at the backend.

`BiteTribeAppCheckProviderFactory` in
`apps/bite-tribe-ios/ios/App/App/AppDelegate.swift` returns
`AppCheckDebugProvider` under `#if targetEnvironment(simulator)`. That branch is
resolved at compile time, so the debug provider cannot reach a store build.

Read the token the provider emits on launch:

```bash
xcrun simctl spawn <UDID> log show --last 5m \
  --predicate 'process == "App"' --style compact \
  | grep -i "debug token"
```

It prints as:

```text
(AppCheckCore) [AppCheckCore][I-GAC004001] App Check debug token: '<UUID>'.
```

Register that value in the Firebase console under **App Check → Apps → the iOS
app row → ⋮ → Manage debug tokens**. The token survives reinstalls of the same
app on the same simulator, so it only has to be registered once per simulator.

**A registered debug token is a standing App Check bypass for whoever holds
it.** Issue one per session and delete it afterwards; the rotation list is on
[issue 1177](https://github.com/muhammedgaygisiz/travellers-apps/issues/1177).
The 31 August 2026 capture session followed exactly that: a token was
registered for the iPad Pro 13-inch simulator, used for the shoot, and deleted
the same evening. The project again holds none.
See [[Current State - Known Issues]] for why every pre-19-August token is
considered burned.

## Capturing Screenshots

```bash
xcrun simctl io <UDID> screenshot out.png
```

The output is at the device's native pixel size, which is what both stores
want. Capture rules, framing decisions and the shipped set are in
[[Implementation - Store Listing Assets]].

## Gotchas

- **The status-bar clock does not advance** in captures from a simulator that
  has been idle. Two screenshots minutes apart can carry the same time, which
  makes a stale screenshot and a fresh one indistinguishable. Trust the log
  timestamps rather than the clock in the frame.
- **`npx nx build bite-tribe` is a production build.** `defaultConfiguration` on
  the target is `production`, so it strips `NX_APP_BITE_TRIBE_IS_DEV` and the
  App Check debug token from the bundle. That is correct here: the native debug
  provider supplies attestation, not the web one.
- **A development build is not an alternative.** It routes at the local
  emulators, so it cannot show production content however App Check is answered.

## Related Pages

- [[Implementation - Android Device Testing]]
- [[Implementation - Store Listing Assets]]
- [[Implementation - Store Release Steps]]
- [[Architecture - Capacitor]]
- [[Current State - Release Candidate Test Charter]]

# Architecture - Capacitor

## Purpose

Capacitor connects the Angular/Ionic apps to native iOS and Android capabilities.

## Native Wrappers

```text
apps/bite-tribe-ios
apps/bite-tribe-android
```

## Main Native Capabilities

- Firebase Authentication.
- Firebase Analytics.
- Firebase Storage.
- Firebase Functions.
- Push notifications.
- Device information for installation labelling.
- Filesystem and local gallery support.
- Geolocation and maps.
- Native image handling and compression support.

## Dependency Rule

When adding or removing native plugins:

- Update the root `package.json` if needed.
- Update the relevant wrapper `package.json`.
- Regenerate wrapper lockfiles from the wrapper directory.
- Run the platform sync target.
- Review generated native diffs.

## Sync Rule

Prefer Capacitor sync over hand-editing generated native dependency files.

### Sync iOS Through The Npm Script

Always sync the iOS wrapper with:

```bash
npm run cap:sync:ios
```

That script is `nx run bite-tribe-ios:sync` with `LANG` and `LC_ALL` pinned to
`en_US.UTF-8`, and the locale is the whole reason it exists. Without it
`pod install` aborts inside the sync with
`Unicode Normalization not appropriate for ASCII-8BIT` from
`Pod::Config#installation_root`: CocoaPods normalizes the installation path and
Ruby refuses to normalize a string tagged `ASCII-8BIT`, which is what a shell
with no UTF-8 locale produces.

Calling `nx run bite-tribe-ios:sync` directly is what reintroduces the failure.
It works from an interactive terminal, which already exports a UTF-8 `LANG`
from the login shell, and fails every time in the shells that do not: agent
runs, scripts, and CI. That asymmetry is why the raw target keeps looking
correct right up until something automated calls it.

The failure is partial, and that is the trap. Capacitor reports `copy ios` as
succeeded, so the web assets do land in `ios/App/App/public`, and only
`update ios` fails. A release that waves the error through wraps the new web
bundle around stale native pods.

Android sync is unaffected and needs no script; it never invokes CocoaPods.

The full procedure is [[Implementation - Store Release Steps]].

## Launch Asset Rule

The launch surfaces — native splash screens, the PWA manifest, and the browser
theme colour — are not free-standing artwork. Their background follows the
app theme in `apps/bite-tribe/src/theme/variables.scss`:

- Light: `$BACKGROUND_COLOR` (`#fff`).
- Dark: `$DARK_BACKGROUND_COLOR` (`#1a1c22`).

Issue [#1203](https://github.com/muhammedgaygisiz/travellers-apps/issues/1203)
closed the gap left when the current palette landed: splash and manifest still
carried the previous warm palette (`#fffbef`, `#00365f`, the orange splash
canvas) while the app itself had already moved to the neutral background.

The generator sources live in `apps/bite-tribe-ios/assets` and feed both
platforms:

```text
splash.png        2732x2732, light background + apps/bite-tribe/src/logo.svg
splash-dark.png   2732x2732, dark background + apps/bite-tribe/src/logo.svg
icon-only.png     app icon mark
icon-foreground.png / icon-background.png   Android adaptive icon layers
```

Regenerate with:

```bash
npm run ios-asset-generator:generate-ios:bite-tribe
npx capacitor-assets generate --android --androidProject apps/bite-tribe-android/android --assetPath apps/bite-tribe-ios/assets
```

The Android run also rewrites the launcher icon (`mipmap-*`,
`mipmap-anydpi-v26/ic_launcher*.xml`) and reformats `AndroidManifest.xml`. The
committed adaptive icon uses `@color/ic_launcher_background`, not the generated
inset mipmap. Keep only the `drawable*/splash.png` output from that run unless
an icon change is the actual intent.

Web launch colours live in `apps/bite-tribe/src/manifest.webmanifest`
(`theme_color`, `background_color`) and the `theme-color` meta pair in
`apps/bite-tribe/src/index.html`. The `apple-splash-*` startup images in
`apps/bite-tribe/src/assets/icons` come from
`npm run pwa-asset-generator:generate:bite-tribe`, which renders on white and
therefore already matched the light background.

## Service Worker Rule

The Angular service worker (`ngsw`) is web-only. `apps/bite-tribe` keeps building it (`serviceWorker: true`), so the PWA is unchanged, but the shell registers it only outside a native platform (issue \#1067).

`libs/bite-tribe/shell/src/lib/service-worker.ts` splits this in two:

- `isServiceWorkerEnabled` - returns `!isDevMode() && !Capacitor.isNativePlatform()` and feeds `provideServiceWorker` in `libs/bite-tribe/shell/src/lib/app.config.ts`.
- `disableServiceWorkerOnNative` - wired as a non-blocking app initializer, unregisters a worker that an earlier native build registered and clears the `ngsw:` caches once no worker controls the document. It never rejects, so a failed cleanup cannot block startup.

The native apps load the same web build from `dist/apps/bite-tribe` inside a WebView, so a registered worker answers from its own cache after a store update: the user still sees the previous build - old build number, old resources - until ngsw has fetched the new version and the WebView is restarted. The native update already ships and versions the web assets, so on native that caching layer only adds a stale window.

Two consequences to keep in mind:

- Do not gate this on the build configuration. Web and native ship the same bundle, so the decision has to stay a runtime platform check.
- Existing native installs need one more app start before the cleanup runs. On the first start after the update the old worker still serves the old bundle, so the new code is not executing yet.

The update alert in `libs/bite-tribe/store/src/lib/service-worker/effects.ts` keeps its `hybrid` guard. `SwUpdate.versionUpdates` is `NEVER` while the worker is disabled, so on native the effect is inert either way.

## Contextual Permission Rule

OS permission prompts must only follow a contextual user action. They must
never appear cold from login, app startup, passive page loading, or background
initialization.

Onboarding is the primary first-run request surface. Explicit setup or recovery
actions may request later when the user understands what capability they are
enabling. For notifications, issue
[#1184](https://github.com/muhammedgaygisiz/travellers-apps/issues/1184) adds
**Receive notifications on this device** in Settings as a second contextual
surface, and issue
[#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386) adds
two more in the same section: **Turn on notifications** next to the muted-device
explanation, and the installation's own switch when the user flips a muted
device back on. All three are contextual — the user asked for notifications on
this device — and all three route through `enablePushOnThisDevice`.

## Media Permission Rule

Picking an existing photo goes through `FilePicker.pickImages({ limit: 1 })` in
`libs/common/ui/image-upload`. On Android the plugin builds an
`ActivityResultContracts.PickVisualMedia` intent, which is the system Photo
Picker: it runs outside the app, returns the one photo the user chose, and
carries its own read grant for that URI.

`limit: 1` is load-bearing, not cosmetic. At the default `0` the plugin builds
`PickMultipleVisualMedia` instead, and the picker opens in multi-select mode
with a confirming tap, while only the first file is ever read.

The picker itself needs no permission. `ACCESS_MEDIA_LOCATION` is nevertheless
declared and requested in front of it, and that is a product decision rather
than an oversight: Android strips a picked photo's location metadata for any
caller that does not hold the grant, so without it the `Aus Bild` position
source in the Bite form is dead on every gallery photo. Declaring the
permission without requesting it buys nothing — it is the grant, not the
declaration, that lifts the redaction. `READ_EXTERNAL_STORAGE` stays for the
same reason: below API 33 `ACCESS_MEDIA_LOCATION` has no effect without it, and
`minSdkVersion` is 24.

The price is the "access photos and videos on this device" prompt, and under
**Allow limited access** a grant screen that asks the user to name the photo
before the picker asks again. That double selection is accepted. It cannot be
removed while the photo position is required, because the prompt and the
unredacted EXIF are the same grant. See GitHub issue #1394.

## Push Permission Rule

`libs/common/push-notifications` splits this in two:

- `initPushListeners` - registers listeners and refreshes the FCM token when permission was already granted. Runs on login (`initAfterLogin$` in the store app effects) and never prompts.
- `requestPushPermission` - shows the prompt and registers on grant. It may be
  called from the onboarding notification step or the explicit Settings setup
  action, and returns `granted` / `denied` / `unsupported` to drive that local
  workflow.
- `enablePushOnThisDevice` - `requestPushPermission` followed by the token
  write. Both contextual surfaces call this rather than the prompt alone, so a
  grant always leaves a registered installation behind.

Do not call `requestPushPermission` from app startup or a login path. A cold
ask there spends the OS prompt before the user has any context for the
decision.

Issue #1184 retires `Settings.pushNotifications`. Onboarding registers the
current installation after a grant and accepts a denial without saving an
account-level notification preference.

## Push Installation Rule

The contract from issue #1184 separates installation identity, the FCM
delivery address, BiteTribe delivery state, and OS permission:

- A random installation UUID is generated once and persisted with Capacitor
  Preferences. It is reused across launches and token rotations and resets
  naturally after reinstall.
- Only registration creates the id. Listing installations uses the non-creating
  read, so a surface that can never register a token — the web build, or a
  device where push was never set up — leaves no identity behind and simply
  matches no row.
- Push-token documents carry the installation ID, platform, device label
  metadata, OS version, app version, `lastSeenAt`, and their own `enabled`
  state.
- The OS version comes from `@capacitor/device`, never from the user agent
  (issue #1263). See the Device Metadata Source Rule below.
- The raw FCM token is not the primary user-facing device label.
- There is at most one active token per installation. Token rotation inherits
  the existing `enabled` state and cleans the superseded token and reverse
  index.
- Registration and login refresh must never silently change an existing
  installation from disabled to enabled.
- Settings lists registered installations and marks the local match as **This
  device**. Legacy tokens without installation metadata remain manageable
  through an **Unknown device** fallback.
- OS permission is checked only for the current installation and displayed
  separately from the backend `enabled` state. Separately, not independently:
  the current installation's switch shows what actually arrives, so a missing OS
  permission renders it off whatever `enabled` says, and switching it back on
  asks the OS instead of writing the flag (issue
  [#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386)).
  See the OS Permission Reflection Rule below.
- The installation list is account data, so it is listed and switchable from
  every signed-in surface, including a platform that cannot receive push
  itself. Only registering _this_ device is platform-gated: the web build says
  it cannot receive notifications and still manages the user's phones.
- Permanent installation deletion or revocation is outside issue #1184.

`libs/common/push-notifications` owns this contract:

- `getInstallationId` / `describeCurrentInstallation` - installation identity
  and the device metadata that labels it.
- `registerPushInstallation` / `registerCurrentPushInstallation` - the
  enabled-preserving upsert plus superseded-token cleanup.
- `loadPushInstallations` / `setPushInstallationEnabled` - the Settings list and
  its per-installation delivery switch.
- `getPushPermissionState` / `openPushSettings` - the current device's OS state
  and its recovery route.
- `enablePushOnThisDevice` - the contextual setup action shared by onboarding
  and Settings.

Backend delivery filtering stays in `getTokens`, which skips a token whose
`enabled` is `false` and keeps delivering to a legacy token that has no flag.

### OS Permission Reflection Rule

Only `granted` means delivery. Every other state mutes the device, and the UI
must say so rather than treat the difference as "not decided yet" (issue
[#1386](https://github.com/muhammedgaygisiz/travellers-apps/issues/1386)).

The two platforms report a revoked permission differently, which is what made
this a rule rather than a detail:

- iOS reports a permission the user turned off in Settings as `denied`.
- Android does not. Capacitor derives its state from
  `checkSelfPermission` plus a cached "never ask again" flag, so revoking
  `POST_NOTIFICATIONS` in system settings returns the permission to an unspent
  `prompt`. Reading `denied` as the only muted state left a registered Android
  device showing its switch fully on while nothing could arrive.

What follows from it:

- `denied` and `prompt` select the recovery action, never whether to show one.
  An unspent prompt is offered as the OS dialog, because it is the shorter route
  back; the system settings page is offered alongside it, because a request the
  OS silently drops would otherwise be a dead end.
- The muted state is stated only where registering the device is not already the
  answer. A device that never registered is told to register, not that something
  is blocking it.
- The judgement covers the current installation alone. Another device's OS grant
  is its own and cannot be read from here.

### Android Settings Route Rule

iOS reaches its own settings page through the `app-settings:` URL scheme and App
Launcher. Android has no such URL, which is why a revoked `POST_NOTIFICATIONS`
had no route back at all.

The route is a native intent, fired by an `AppSettings` plugin that is part of
the Android wrapper rather than an npm dependency:
`apps/bite-tribe-android/android/app/src/main/java/com/bitetribe/app/AppSettingsPlugin.java`,
registered in `MainActivity` before `super.onCreate` builds the bridge. It tries
`ACTION_APP_NOTIFICATION_SETTINGS` first — the app's own notification page,
carrying exactly the switch the user came for — and falls back to
`ACTION_APPLICATION_DETAILS_SETTINGS`, which exists on every Android version the
app supports. It resolves whether a page opened, so a caller can keep guiding
the user instead of appearing to do nothing.

`libs/common/push-notifications/src/lib/app-settings.ts` is the web-side proxy.
Location has the same Android gap and is the obvious second caller; the proxy
moves out of `push-notifications` when it gets one.

Recovery is recognised on re-entering the Settings page, which reloads the
installation list and re-reads the permission. Returning from the system
settings page to a Settings page that is still mounted does not re-read it — the
same limitation iOS has, and not addressed by #1386.

See [[issue-1386]] for what reading a revoked Android permission as "not decided
yet" cost.

### Device Metadata Source Rule

The two halves of a device row have different truth requirements, so they have
different sources (issue
[#1263](https://github.com/muhammedgaygisiz/travellers-apps/issues/1263)).

- The **device label** stays derived from `navigator.userAgent`. It only has to
  make a row recognisable among a user's own devices, and no user agent lies
  about being an iPhone or a Pixel 7.
- The **OS version** is read from `@capacitor/device`. WKWebView freezes the
  version it announces in its user agent — a device on iOS 26.5.2 still reports
  `OS 18_7 like Mac OS X` — so a parsed value is not a stale approximation but a
  false statement, displayed to the user and persisted with the push token.
- Both native platforms read the same native source. The Android user agent
  happens to be truthful about the version, but a field is not trusted for being
  accidentally right.
- The web build asks for no version: a browser has no device OS worth printing
  next to its name.
- A failed native read yields an empty version, never the frozen user-agent
  value. The row then reads `iOS` alone, which is less than the truth but never
  against it, and `toOsLabel` in the Settings service already drops an absent
  version — the same path a legacy token takes.
- Dropping the version from the iOS label entirely was considered and rejected:
  the field exists to disambiguate a user's own devices, and a real version does
  that while an absent one does not.

## Location Permission Rule

Location follows the same contextual rule as push. Onboarding explains what the
position is used for before the primary request (epic #850, issue #1023), while
an explicit later recovery action may request an unspent permission or guide a
denied user to device settings.

`libs/common/geolocation` splits this in two:

- `getCurrentPosition` - reads the position on an existing grant and never prompts; it errors instead when permission is not granted, and callers already treat a missing position as non-fatal. Every position read goes through it: the login path (`dispatchGpsPosition` in `initAfterLogin$`) and the Bite details distance (`positionLoader` in `libs/bite-tribe/details/data-access`). Do not re-implement the check/read inline — that is how a stray `requestPermissions` call gets reintroduced.
- `requestLocationPermission` - shows the prompt. Called from onboarding or an
  explicit location setup/recovery action, and returns `granted` / `denied` /
  `unsupported` so the caller can continue its contextual workflow.

`getCurrentPosition` bails out before reading when permission is undecided on a native platform. `checkPermissions` never prompts, but `getCurrentPosition` does — the native plugin asks the OS itself — so the guard, not the absence of a `requestPermissions` call, is what keeps the login path silent.

Do not call `requestLocationPermission` from app startup, a login path, or
passive position loading.

### Denied-Permission Recovery Rule

A denial is not just a failed read: the OS ignores every further permission
request, so the system settings page is the only way back. Recovery surfaces
must therefore branch on the state, not on the failure (issue #1183).

- The refused read carries the reason. `LocationPermissionNotGrantedError`
  holds the `permissionState` that blocked it, so no caller has to ask the OS a
  second time to find out. `dispatchGpsPosition` forwards it on
  `Error loading GPS position`, and it is undefined when the read failed for
  some other reason — no fix, a browser refusal — where the settings page would
  not have been the obstacle.
- Copy names the handoff. A `denied` state gets its own explanation and an
  action labelled as opening the settings page. Wording that promises an in-app
  switch (`enable-location`) is only correct for `prompt`, where an OS prompt is
  still available.
- Success clears the error. Every successful read resets
  `errorLoadingGpsPosition`, including
  `Updated GPS position without reload` — restoring access rarely moves a user
  past the 100 m reload threshold, so that is exactly where the recovered read
  lands.
- The return trip is a refresh. `AppForegroundService` re-reads the position on
  any foreground event that finds a location error pending, without waiting out
  `FOREGROUND_REFRESH_THRESHOLD_MS`; the settings round trip is far shorter
  than that threshold.
- `openLocationSettings` is iOS-only. It reports `false` on every other
  platform, so a caller must not present the handoff as guaranteed.

## Code Anchors

```text
apps/bite-tribe-ios/capacitor.config.ts
apps/bite-tribe-android/capacitor.config.ts
apps/bite-tribe-ios/assets
apps/bite-tribe/src/manifest.webmanifest
apps/bite-tribe/src/index.html
apps/bite-tribe-ios/package.json
apps/bite-tribe-android/package.json
libs/bite-tribe/shell/src/lib/service-worker.ts
libs/common/geolocation
libs/common/push-notifications
libs/common/networkstatus/feature
libs/common/image-compression
```

## Current Limitations

- Native plugin changes must be reflected consistently in root and wrapper package files.
- Android and iOS generated files should be treated as sync output, not hand-maintained source of truth.

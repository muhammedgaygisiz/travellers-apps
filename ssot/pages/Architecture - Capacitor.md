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
surface.

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
  separately from the backend `enabled` state.
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

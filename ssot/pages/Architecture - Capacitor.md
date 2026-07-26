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

## Push Permission Rule

The OS shows its push permission prompt once per install, so the ask is owned by exactly one surface: the onboarding notification step, which explains the value first (epic \#850, issue \#1015).

`libs/common/push-notifications` splits this in two:

- `initPushListeners` - registers listeners and refreshes the FCM token when permission was already granted. Runs on login (`initAfterLogin$` in the store app effects) and never prompts.
- `requestPushPermission` - shows the prompt and registers on grant. Called only from the onboarding notification step, and returns `granted` / `denied` / `unsupported` so the choice can be recorded in settings.

Do not call `requestPushPermission` from app startup or a login path. A cold ask there spends the single OS prompt before the user has any context, and the onboarding step can then never prompt.

## Location Permission Rule

Location follows the same rule as push, for the same reason: the OS asks once per install, so the ask is owned by the onboarding location step, which explains what the position is used for first (epic \#850, issue \#1023).

`libs/common/geolocation` splits this in two:

- `getCurrentPosition` - reads the position on an existing grant and never prompts; it errors instead when permission is not granted, and callers already treat a missing position as non-fatal. Every position read goes through it: the login path (`dispatchGpsPosition` in `initAfterLogin$`) and the Bite details distance (`positionLoader` in `libs/bite-tribe/details/data-access`). Do not re-implement the check/read inline — that is how a stray `requestPermissions` call gets reintroduced.
- `requestLocationPermission` - shows the prompt. Called only from the onboarding location step, and returns `granted` / `denied` / `unsupported` so the choice can be recorded in settings (`Settings.location`).

`getCurrentPosition` bails out before reading when permission is undecided on a native platform. `checkPermissions` never prompts, but `getCurrentPosition` does — the native plugin asks the OS itself — so the guard, not the absence of a `requestPermissions` call, is what keeps the login path silent.

Do not call `requestLocationPermission` from app startup or a login path.

## Code Anchors

```text
apps/bite-tribe-ios/capacitor.config.ts
apps/bite-tribe-android/capacitor.config.ts
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

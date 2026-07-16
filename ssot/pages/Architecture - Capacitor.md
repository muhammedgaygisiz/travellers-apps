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

## Push Permission Rule

The OS shows its push permission prompt once per install, so the ask is owned by exactly one surface: the onboarding notification step, which explains the value first (epic \#850, issue \#1015).

`libs/common/push-notifications` splits this in two:

- `initPushListeners` - registers listeners and refreshes the FCM token when permission was already granted. Runs on login (`initAfterLogin$` in the store app effects) and never prompts.
- `requestPushPermission` - shows the prompt and registers on grant. Called only from the onboarding notification step, and returns `granted` / `denied` / `unsupported` so the choice can be recorded in settings.

Do not call `requestPushPermission` from app startup or a login path. A cold ask there spends the single OS prompt before the user has any context, and the onboarding step can then never prompt.

## Code Anchors

```text
apps/bite-tribe-ios/capacitor.config.ts
apps/bite-tribe-android/capacitor.config.ts
apps/bite-tribe-ios/package.json
apps/bite-tribe-android/package.json
libs/common/geolocation
libs/common/push-notifications
libs/common/networkstatus/feature
libs/common/image-compression
```

## Current Limitations

- Native plugin changes must be reflected consistently in root and wrapper package files.
- Android and iOS generated files should be treated as sync output, not hand-maintained source of truth.

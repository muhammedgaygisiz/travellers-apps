# Capacitor

When adding or removing native Capacitor plugins, treat app wrapper package files as the durable source for native plugin discovery.

1. Add the plugin to the root `package.json` if it is not already installed.
2. Add the plugin to the relevant wrapper `package.json`, for example `apps/bite-tribe-ios/package.json` or `apps/bite-tribe-android/package.json`.
3. Regenerate the corresponding wrapper `package-lock.json` with:

```bash
npm install --package-lock-only --ignore-scripts
```

Run that command from the wrapper directory.

4. Run the platform sync target, for example:

```bash
nx run bite-tribe-ios:sync
```

5. Review generated native diffs and lockfiles. Prefer the sync workflow over hand-editing generated native dependency blocks such as the iOS `Podfile`.

If Android native setup is intentionally deferred but shared TypeScript/native bridge code is Android-ready, still consider adding the Android wrapper package entry so future Android sync/update work can discover the plugin consistently.

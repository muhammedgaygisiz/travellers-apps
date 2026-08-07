# Implementation - Release And Build Workflow

## Purpose

Release and build workflow describes the implementation-facing scripts that support build numbers, changelog output, Storybook, assets, and native wrappers.

## Npm Scripts

| Script                                                  | Purpose                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run start`                                         | Serve an Nx app through the default serve target                  |
| `npm run development`                                   | Start Firebase serve and the BiteTribe app together               |
| `npm run build`                                         | Run Nx build                                                      |
| `npm run test`                                          | Run affected Nx tests against `develop`                           |
| `npm run storybook`                                     | Start Storybook host                                              |
| `npm run build:storybook`                               | Build Storybook and refresh the Nx graph asset                    |
| `npm run increment-build-number`                        | Increment the shared build number                                 |
| `npm run generate-changelog`                            | Generate incremental changelog output                             |
| `npm run generate-full-changelog`                       | Generate full Logseq changelog output                             |
| `npm run increment-build-number-and-generate-changelog` | Generate changelog, increment build number, commit, tag, and push |
| `npm run cap:run:ios`                                   | Run Capacitor iOS                                                 |
| `npm run cap:run:android`                               | Run Capacitor Android                                             |

## Native Wrapper Targets

The native wrappers are Nx projects, so their Capacitor commands are targets
rather than npm scripts:

| Target                             | Purpose                                        |
| ---------------------------------- | ---------------------------------------------- |
| `nx run bite-tribe-ios:sync`       | Capacitor sync into the iOS wrapper            |
| `nx run bite-tribe-android:sync`   | Capacitor sync into the Android wrapper        |
| `nx run bite-tribe-ios:open`       | Open the iOS wrapper in Xcode                  |
| `nx run bite-tribe-android:open`   | Open the Android wrapper in Android Studio     |
| `nx run bite-tribe-android:bundle` | Build the signed release `.aab` through Gradle |

Use the `run <project>:<target>` form. `nx sync` without `run` is Nx's built-in
workspace sync-generator command and does not sync Capacitor.

## Release Helper Behavior

`npm run increment-build-number-and-generate-changelog` is not just a bump. In
`tools/increment-build-number-and-generate-changelog.mjs` it:

1. Refuses to run against a dirty working tree.
2. Reads the current version and build number and refuses if the resulting tag
   already exists locally or on `origin`.
3. Runs `generate-changelog`, then `increment-build-number`.
4. Stages `CHANGELOG.md` and both native version files, and commits as
   `chore: prepare build <version>-<build number> release`.
5. Creates the annotated tag `build-<version>-<build number>` using the build
   number captured **before** the increment.
6. Pushes the branch and the tag.

Because it pushes, no separate `git push` or `git push --tags` is needed after
it. The tag is created on the bump commit, which already carries the next build
number, so the tag names the released build but does not point at the released
source tree.

## Native Asset Scripts

```text
npm run pwa-asset-generator:generate:bite-tribe
npm run ios-asset-generator:generate-ios:bite-tribe
```

## Rules

- Use the existing build-number scripts instead of editing generated release state manually.
- Generate changelog and release notes after the current native build is published, but before incrementing the shared build number for the next development week.
- Run the build-number increment only after the current build has been built, released, and published to native stores.
- Capture the native version and build number before incrementing when creating release tags. The combined helper tags the release commit as `build-<version>-<build-number>`, for example `build-1.0.1-81`.
- Use the changelog scripts for SSOT changelog pages.
- Derive the short TestFlight and Google Play build notes from the generated changelog, using the `### Features` to `### Chores` range and summarizing it to at most 230 characters. The changelog is produced by tooling, so it is the reliable source; closed Priority P0 issue titles from the release week are a cross-check, not the input.
- Use Capacitor sync commands when native dependency or wrapper state changes.
- Keep source maps and native build artifacts traceable to the release build number and future git tag.
- Treat generated native files as outputs unless the requested change specifically targets native wrapper source.
- Keep local and CI Node.js versions explicitly aligned as defined by [[Current State - Nx And Dependency Migration Roadmap]].
- Keep visual regression scripts as direct `oblador/loki` CLI wrappers; do not route them through `nx-loki` or inferred Nx targets.

## Build-Time Environment Variables

Each app owns an `env-var-plugin.js` that calls the shared factory in `tools/env-var-plugin.js`. The factory inlines the collected values into every `process.env` reference, so anything it returns is readable by anyone through browser DevTools.

Rules:

- Add a variable to an app's `allowedKeys` before reading it through `process.env` in app or library code. Nothing is inlined by prefix, so an unlisted variable resolves to `undefined` at runtime.
- Treat the allowlist as the security boundary. It exists so an unrelated `NX_*` variable that happens to be set at build time — an Nx internal such as `NX_WORKSPACE_ROOT`, or a future secret — cannot reach the browser by accident.
- Add any variable that must not reach production to `DEV_ONLY_ENV_KEYS`. `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` is there because a registered debug token bypasses App Check entirely; `NX_APP_BITE_TRIBE_IS_DEV` is there because it routes the app at the emulators.
- Keep values that identify the bundle rather than the deployment in the app plugin's `staticValues`, not in `.env`. `NX_APP_BITE_TRIBE_IS_BUSINESS` is set this way for the business app.
- Firebase web configuration and the reCAPTCHA site key are public by design and stay in the bundle. Access control comes from Firestore rules and App Check, not from hiding these identifiers.

## Related Pages

- [[Release Workflow]]
- [[Implementation - Store Release Steps]]
- [[Architecture - Capacitor]]
- [[Implementation - Testing]]
- [[Implementation - CI Pipeline]]
- [[Current State - Nx And Dependency Migration Roadmap]]

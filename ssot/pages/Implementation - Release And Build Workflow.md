# Implementation - Release And Build Workflow

## Purpose

Release and build workflow describes the implementation-facing scripts that support build numbers, changelog output, Storybook, assets, and native wrappers.

## Npm Scripts

| Script                                                  | Purpose                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run start`                                         | Serve an Nx app through the default serve target                                              |
| `npm run development`                                   | Start Firebase serve and the BiteTribe app together                                           |
| `npm run build`                                         | Run Nx build                                                                                  |
| `npm run test`                                          | Run affected Nx tests against `develop`                                                       |
| `npm run storybook`                                     | Start Storybook host                                                                          |
| `npm run build:storybook`                               | Build Storybook and refresh the Nx graph asset                                                |
| `npm run increment-build-number`                        | Increment the shared build number                                                             |
| `npm run sync-native-version`                           | Write the `package.json` marketing version into both native projects                          |
| `npm run release:android`                               | Build, sign, and verify the Android release bundle                                            |
| `npm run release:verify-bundle`                         | Assert a built web bundle carries no dev-only key and does carry the App Check gate           |
| `npm run release:provenance`                            | Write `dist/build-provenance.json` naming the version, build number, and source commit        |
| `npm run generate-changelog`                            | Generate incremental changelog output                                                         |
| `npm run release:notes`                                 | Print the changelog range for store build notes (`-- --full` for the GitHub release body)     |
| `npm run generate-full-changelog`                       | Generate full Logseq changelog output                                                         |
| `npm run increment-build-number-and-generate-changelog` | Generate changelog, increment build number, commit, tag, push, and publish the GitHub release |
| `npm run cap:sync:ios`                                  | Capacitor sync into the iOS wrapper with a UTF-8 locale pinned                                |
| `npm run cap:run:ios`                                   | Run Capacitor iOS                                                                             |
| `npm run cap:run:android`                               | Run Capacitor Android                                                                         |

## Native Wrapper Targets

The native wrappers are Nx projects, so their Capacitor commands are targets
rather than npm scripts:

| Target                             | Purpose                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `nx run bite-tribe-ios:sync`       | Capacitor sync into the iOS wrapper; call it through `npm run cap:sync:ios`, never directly                           |
| `nx run bite-tribe-android:sync`   | Capacitor sync into the Android wrapper                                                                               |
| `nx run bite-tribe-ios:open`       | Open the iOS wrapper in Xcode                                                                                         |
| `nx run bite-tribe-android:open`   | Open the Android wrapper in Android Studio                                                                            |
| `nx run bite-tribe-android:bundle` | Bare Gradle `bundleRelease`; prefer `npm run release:android`, which also resolves the JDK and verifies the signature |

Use the `run <project>:<target>` form. `nx sync` without `run` is Nx's built-in
workspace sync-generator command and does not sync Capacitor.

## Release Helper Behavior

`npm run increment-build-number-and-generate-changelog` is not just a bump. In
`tools/increment-build-number-and-generate-changelog.mjs` it:

1. Refuses to run against a dirty working tree.
2. Reads the version from `package.json` and the build number from the native
   projects, and refuses if the resulting tag already exists locally or on
   `origin`. It also refuses a `package.json` still holding `0.0.0`.
3. Runs `generate-changelog`, then `sync-native-version`, then
   `increment-build-number`.
4. Verifies afterwards that `package.json`, Android `versionName`, and every
   iOS `MARKETING_VERSION` name the same version, and fails the release if they
   do not.
5. Stages `CHANGELOG.md` and both native version files, and commits as
   `chore: prepare build <version>-<build number> release`.
6. Creates the annotated tag `build-<version>-<build number>` using the build
   number captured **before** the increment.
7. Pushes the branch and the tag.
8. Publishes the GitHub release `Build <build number>` from that tag, using the
   full changelog range as the body. `BITETRIBE_RELEASE_DRAFT=1` creates it as a
   draft instead. A failure here is reported explicitly with a retry command,
   and does not undo the push that already happened.

Because it pushes, no separate `git push` or `git push --tags` is needed after
it. The tag is created on the bump commit, which already carries the next build
number, so the tag names the released build but does not point at the released
source tree.

## Native Release Jobs In CI

`.github/workflows/native-release.yml` produces the signed Android bundle and
the signed iOS archive on runners rather than on a workstation. It exists
because a hand-built store artifact is tied to a commit only by convention:
build 92's source had to be reconstructed afterwards from one machine's reflog,
and the answer was `ac217b99` plus an uncommitted change, which is to say no
commit at all. See
[issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181).

### Triggers

| Trigger                 | Behavior                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| Push of a `build-*` tag | Builds both platforms and retains the artifacts. Does not publish. |
| `workflow_dispatch`     | Same, with a `platform` choice and an opt-in `publish`             |

Publishing is opt-in even on a tag. A build number cannot be reused once a
store has seen it, so an accidental upload is not undoable, and the default run
therefore stops at a retained artifact.

This is the one workflow that is deliberately **not** in `pipeline.yml`. The
rule that keeps deploys there exists because a hand-dispatched workflow goes
stale, and nothing here can: a release creates a `build-*` tag and the tag fires
the workflow. Against that, `pipeline.yml` gates changes on their way to
`develop`, runs on every pull request, and would have to grow a tag trigger and
a guard on every existing job to host a native build that needs a macOS runner.

### Job Graph

```text
web-bundle  (ubuntu-latest)
|
+-- android (ubuntu-latest)
+-- ios     (macos-latest)
```

`web-bundle` builds the production bundle **once** and both wrappers download
it. Building it per platform would let the two store artifacts wrap different
web bundles, which is the same failure the manual release avoids by not
re-syncing between the iOS archive and the Android bundle.

The `ios` job does not use `.github/actions/setup`. That action keys the
`node_modules` cache on `package-lock.json` alone, with no runner OS in it, so a
macOS job sharing it would either restore Linux native binaries or overwrite the
entry every Linux job depends on. It runs `actions/setup-node` and `npm ci`
directly instead.

### What The Jobs Assert

Every one of these was a human step before, and each is now a job failure:

- `npm run release:verify-bundle` runs in all three jobs. It fails when either
  key in `DEV_ONLY_ENV_KEYS` is inlined, and when
  `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED` is not inlined as `true`. The native
  jobs re-run it on the downloaded artifact rather than trusting the job that
  produced it.
- `npm run release:android` fails on an unsigned bundle, and on one signed with
  a key other than the Play upload key.
- The iOS job reads `CFBundleShortVersionString` and `CFBundleVersion` out of
  the finished archive and fails unless they match the tree. This is the
  Organizer check from the manual release, which was previously a human reading
  a dialog.
- `ExportOptions.plist` sets `manageAppVersionAndBuildNumber` to `false`. Left
  on, Xcode picks its own build number at export and the artifact stops matching
  the shared build number.

### Quoting Is Not Part Of The Check

`release:verify-bundle` accepts `"true"`, `'true'` and `` `true` `` on the
value side, and the same three around the key.

This is not defensive padding. The build of commit `297f8be4` emits
`` NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED:`true` `` — a template literal — so the
double-quoted grep that [[Release Workflow]] and
[[Current State - Release Candidate Test Charter]] both document returns **no
match** on a bundle that is entirely correct. A check whose "expected match"
half silently never matches is worse than no check. Which quote form the
minifier picks is not a property the release cares about, so the script does not
care either.

### Artifact Naming And Provenance

`npm run release:provenance` writes `dist/build-provenance.json` and names the
artifacts. Both carry the version, the build number, and the short commit:

```text
bite-tribe-1.0.1-96-297f8be.aab
bite-tribe-1.0.1-96-297f8be.ipa
bite-tribe-1.0.1-96-297f8be-dsyms.zip
```

The provenance file travels inside every uploaded artifact and adds the full
commit, the ref, the build timestamp, and the workflow run URL. Neither store
exposes the source commit, so this is where the answer lives.

The iOS dSYMs are retained for the same reason. A crash reported against a CI
artifact can then be symbolicated from CI output rather than from whichever
workstation happened to build it.

### Tag And Tree Can Disagree, And The Tree Wins

The release helper tags the bump commit, so a `build-<version>-<x>` tag names
build `x` on a tree that already carries `x+1`. A tag-triggered run therefore
builds `x+1`, not the `x` the tag is named after.

The jobs read the version and build number from the tree, name the artifacts
from the tree, and emit a warning when the tag disagrees. They do not fail:
under the current release ordering the tag is created _after_ the artifacts are
uploaded, so a disagreement is the expected state, not a defect.

Adopting CI artifacts as the released ones means inverting that order —
dispatch the workflow on the release branch while it still carries build `x`,
then run the release helper. [[Release Workflow]] records that as the open
decision; nothing in this workflow depends on it being made.

### Secrets

None of these existed when the workflow was written. The jobs fail with a named
error rather than an unsigned artifact when one is missing.

| Secret                                 | Job       | Contents                                                      |
| -------------------------------------- | --------- | ------------------------------------------------------------- |
| `BITETRIBE_KEYSTORE_BASE64`            | `android` | The upload keystore `.jks`, base64-encoded                    |
| `BITETRIBE_KEYSTORE_PASSWORD`          | `android` | Its store password                                            |
| `BITETRIBE_KEY_ALIAS`                  | `android` | The key alias, unquoted                                       |
| `BITETRIBE_KEY_PASSWORD`               | `android` | The key password                                              |
| `PLAY_SERVICE_ACCOUNT_JSON`            | `android` | Play Developer API service account JSON, publishing only      |
| `IOS_DIST_CERTIFICATE_P12_BASE64`      | `ios`     | Apple Distribution certificate and private key, base64 `.p12` |
| `IOS_DIST_CERTIFICATE_PASSWORD`        | `ios`     | The `.p12` export password                                    |
| `APP_STORE_CONNECT_KEY_ID`             | `ios`     | App Store Connect API key id                                  |
| `APP_STORE_CONNECT_ISSUER_ID`          | `ios`     | App Store Connect API issuer id                               |
| `APP_STORE_CONNECT_PRIVATE_KEY_BASE64` | `ios`     | `AuthKey_<key id>.p8`, base64-encoded                         |

Set them with `tools/set-native-release-secrets.sh`, which takes a section:

```bash
bash tools/set-native-release-secrets.sh android
bash tools/set-native-release-secrets.sh ios
bash tools/set-native-release-secrets.sh play
```

It reads each value from a local file or a hidden prompt and pipes it straight
into `gh secret set`, so nothing is echoed, written to disk, or passed as a
command argument where `ps` could read it.

The `android` section needs no input at all: `keystore.properties` already holds
every value, and the job reads the same four through the environment-variable
fallback in `app/build.gradle`. The script strips the newline `sed` leaves on a
properties value, because an alias of `First Key\n` fails signing with the same
misleading `No key with alias` that quoting the value causes. See
[[Implementation - Store Release Steps]].

`PLAY_SERVICE_ACCOUNT_JSON` is only read when publishing, which is off by
default, so the `play` section can stay unset until a store upload is wanted.

### The Android Track Is Open Testing, As A Draft

The publish step uploads to `beta`, which is **Open testing** in the Play
Developer API, and creates the release as a **draft**.

Both halves were wrong in the first version of this workflow, and both were
taken from the wording of
[issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)
rather than from the SSOT:

- **Not `internal`.** BiteTribe distributes on Android through Open testing.
  The internal track is paused and abandoned, still holding a February build 58
  and an `Untitled release` draft. [[Implementation - Store Listing Assets]]
  records mistaking that paused track for a release blocker as an error already
  made once, and closes with the rule this repeats: check which track the
  product actually ships on.
- **Not `completed`.** The store build notes are produced by summarizing
  `npm run release:notes` to at most 230 characters, by a person, and the
  submission for review is a deliberate click. A completed release would reach
  review carrying no notes. `draft` leaves the console steps in
  [[Implementation - Store Release Steps]] exactly as they are.

An issue body is a starting hypothesis. The SSOT is the source of truth, and
where the two disagree the SSOT wins.

The Firebase `NX_APP_*` secrets the `web-bundle` job needs already exist; it
uses the same set as `deploy-bite-tribe`, including the misspelled
`NX_APP_BITE_TRIBE_MESSAGINX_SENDER_ID`.

Signing stays **automatic**, as it is in the Xcode project. The App Store
Connect API key lets `xcodebuild -allowProvisioningUpdates` fetch the
provisioning profile, so no profile is carried in a secret and the CocoaPods
targets keep their own signing settings. `App.xcscheme` is committed as a shared
scheme for the same reason `xcodebuild` needs a scheme it can name.

The API key needs **App Manager or Admin**. A Developer-role key authenticates
but may not fetch or create the distribution profile, which is the whole reason
the key is passed.

#### The Distribution Certificate Had To Be Created

Before 30 August 2026 there was none to export. `security find-identity -v` on
the release workstation listed a single identity, `Apple Development`, and
`security find-certificate -c "Apple Distribution"` found nothing in any
keychain - while TestFlight uploads had been happening for months.

The explanation is **cloud-managed signing**: Xcode's automatic distribution
certificate keeps its private key with Apple. It works from Xcode, appears
nowhere in Keychain Access, and is not listed under Manage Certificates, so
there is nothing on disk for CI to import. A release process can depend on it
for a year without anyone noticing it cannot leave the machine.

An Apple Distribution certificate was created on 30 August 2026 through Xcode,
Settings, Apple Accounts, the team row, `Manage Certificates`, then the `+`
menu. It landed in the login keychain with its private key, which
`security find-identity -v -p codesigning` confirms by listing it at all - that
policy only shows certificates whose private key is present. The cap is two per
team and one is now used.

Rules:

- Export as **Personal Information Exchange (`.p12`)**, not `.cer`. A `.cer`
  omits the private key, encodes to a plausible-looking secret, and fails only
  once a macOS job has run.
- Delete the exported `.p12` once the secret is set. The keychain copy is the
  original; the export is a second copy of a private key sitting in a folder.

##### Verifying A `.p12` With Homebrew OpenSSL

`openssl pkcs12 -in <file> -noout -info` fails on a Keychain Access export with
`Error outputting keys and certificates`. This is not a bad export.

Keychain Access writes `.p12` files with legacy algorithms - 3DES for the key,
RC2 for the certificates - and OpenSSL 3 refuses them unless asked:

```bash
openssl pkcs12 -legacy -in <file> -noout -info
```

A `Shrouded Keybag` line in that output is the private key. macOS ships
LibreSSL as `/usr/bin/openssl`, which needs no flag; the failure appears when
Homebrew's OpenSSL 3 is first on `PATH`.

None of this affects CI, which imports with `security import` rather than
OpenSSL and reads those algorithms natively. It only affects checking the file
by hand.

#### The API Key Must Be Admin

App Store Connect gates the API behind a one-time organization-level unlock -
`Users and Access`, `Integrations`, `Request Access` - which the Account Holder
approves for themselves. Until it is granted, no key can exist.

The key must be scoped **Admin**. This was tried the other way first, on the
least-privilege reasoning that the key only has to fetch a provisioning profile
and upload a build, and that Admin would additionally let a leaked key revoke
certificates. Run #1 disproved it:

```text
error: exportArchive Cloud signing permission error
** EXPORT FAILED **
error: exportArchive No profiles for 'com.bitetribe.app' were found
```

The archive itself succeeded and passed the build-number assertion. Only
`-exportArchive` failed, because that is where the **App Store** provisioning
profile is required, and creating or downloading one is cloud signing.
App Manager covers apps and TestFlight; certificates and profiles are Admin.
There is no narrower role that can run `-allowProvisioningUpdates`.

The lower-privilege alternative is to stop asking `xcodebuild` to manage
signing at all: create the App Store provisioning profile by hand in the
developer portal, carry it in a secret, and switch `ExportOptions.plist` to
`signingStyle: manual`. That would work with a weaker key, at the cost of one
more secret and a profile that expires every year and fails a release when it
does. The Admin key is the smaller ongoing burden.

Generating a replacement key is cheap - fifty can be active at once - so a role
that turns out to be too narrow costs one dispatch, not a rebuild.

### Run History

Both jobs are proven. The workflow produced signed, named, commit-traceable
Android and iOS artifacts on runners, with no workstation involved, on
30 August 2026.

| Run | Ref                                               | Trigger  | web-bundle    | android       | ios            |
| --- | ------------------------------------------------- | -------- | ------------- | ------------- | -------------- |
| #1  | `develop@963e247`                                 | dispatch | pass, 2.2 min | pass, 5.5 min | fail at export |
| #2  | `1181-fix-native-release-artifact-naming@1cafbd0` | dispatch | pass, 1.8 min | pass, 5.2 min | pass, 22.9 min |
| #3  | `develop@dcd8d39`                                 | dispatch | pass, 1.9 min | pass, 5.3 min | pass, 20.5 min |
| #4  | `build-1.0.1-96@269cb26`                          | tag push | pass, 1.8 min | pass, 5.6 min | -              |

**Run #3 produced the artifacts that were actually released** as build 96 on
30 August 2026: `bitetribe-1.0.1-96-dcd8d39-android` at 15.7 MB and
`bitetribe-1.0.1-96-dcd8d39-ios` at 118.1 MB, the latter carrying the `.ipa`,
the dSYMs and the provenance. Both went to the stores by hand, through
Transporter and the Play Console, because the publish steps are still unrun.

**Run #4 is the off-by-one, observed rather than predicted.** Pushing the
`build-1.0.1-96` tag fired the workflow against the bump commit, which already
carries 97, so it produced `bitetribe-1.0.1-97-269cb26-android` under a tag
named 96 and logged:

```text
Tag build-1.0.1-96 names build 1.0.1 (96), but this tree is 1.0.1 (97).
The artifacts are named after the tree, which is what was actually built.
```

That is the designed behaviour and it costs a runner. Expect one such run after
every release until the ordering question in [[Release Workflow]] is settled.

Run #1 found two defects, both recorded above: the artifact name emptied by
secret redaction, and an App Store Connect key scoped too narrowly to export.
Its Android bundle was correctly built and signed and then dropped, arriving as
412 bytes of provenance JSON.

Budget the iOS job at roughly 23 minutes and the Android job at 5. The iOS
figure is dominated by `pod install` and the archive, and it is why this
workflow is not on the pull-request path.

### Still Not Verified

- **Neither publish step has ever run.** Both are opt-in and off by default,
  and `PLAY_SERVICE_ACCOUNT_JSON` is still deliberately unset. The TestFlight
  and Play Open testing uploads are therefore written but unexecuted.
- **No artifact has been installed on a device.** The jobs prove the artifacts
  are produced, signed and named; they do not prove either one runs.
  [issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)
  asks for an install of each, and that is what remains of it.
- The Xcode version is whatever `macos-latest` carries, so an artifact is
  reproducible against a commit but not against a toolchain.

## Native Asset Scripts

```text
npm run pwa-asset-generator:generate:bite-tribe
npm run ios-asset-generator:generate-ios:bite-tribe
```

## Marketing Version

`package.json` is the single source of truth for the marketing version. Bump it
there and nowhere else.

Everything else is downstream of it:

- `tools/env-var-plugin.js` inlines it into `process.env['version']`, which is
  what the app menu, the About page, and the `appVersion` written to the user
  document all read.
- `npm run sync-native-version` writes it into Android `versionName` and every
  iOS `MARKETING_VERSION`, and the release helper runs that and then verifies
  all three agree.

Rules:

- A release does not bump it. Only the build number moves on a release; the
  marketing version changes when someone edits `package.json` on purpose, which
  is rare. `sync-native-version` is therefore a no-op on most releases, writing
  back the version that is already there.
- Do not edit `versionName` or `MARKETING_VERSION` by hand. They are release
  outputs, in the same sense the build number already was.
- Do not reintroduce reading the version out of the native projects into the
  bundle. That is what left `package.json` at `0.0.0` while the app displayed
  and persisted it as a fact (issue #1303).
- On a native build the app prefers what `App.getInfo()` reports over the
  build-time value, through `appRelease` in `libs/common/utils`. That is a
  safety net for a skipped or failed sync, not a second source of truth: the web
  build has no native bundle to ask and always reports the build-time value.

## Rules

- Use the existing build-number scripts instead of editing generated release state manually.
- Generate changelog and release notes after the current native build is published, but before incrementing the shared build number for the next development week.
- Run the build-number increment only after the current build has been built, released, and published to native stores.
- Capture the `package.json` version and the native build number before incrementing when creating release tags. The combined helper tags the release commit as `build-<version>-<build-number>`, for example `build-1.0.1-81`.
- Use the changelog scripts for SSOT changelog pages.
- Derive the short TestFlight and Google Play build notes from the generated changelog, using the `### Features` to `### Chores` range and summarizing it to at most 230 characters. The changelog is produced by tooling, so it is the reliable source; closed Priority P0 issue titles from the release week are a cross-check, not the input.
- Use Capacitor sync commands when native dependency or wrapper state changes.
- Sync iOS through `npm run cap:sync:ios`, never through
  `nx run bite-tribe-ios:sync` directly. The script pins `LANG` and `LC_ALL`;
  without a UTF-8 locale CocoaPods aborts `pod install` while Capacitor still
  reports the web-asset copy as succeeded, so the wrapper ends up with new web
  assets and stale native pods. The raw target works from an interactive
  terminal and fails in agent shells and CI, which is why it keeps getting
  called. See [[Architecture - Capacitor]].
- Keep source maps and native build artifacts traceable to the release build number and future git tag.
- Run `npm run release:verify-bundle` against `dist/apps/bite-tribe` before
  wrapping it, by hand or in CI. Do not hand-grep for the dev-only keys: the
  quoting the minifier chooses varies, and the documented double-quoted grep
  misses a correct bundle.
- Add a key to `DEV_ONLY_ENV_KEYS` and the release check starts asserting it.
  The check imports that list rather than repeating it.
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
- [[Current State - Release Candidate Test Charter]]
- [[Current State - Nx And Dependency Migration Roadmap]]

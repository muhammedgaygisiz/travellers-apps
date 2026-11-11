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
| `npm run generate-full-changelog`                       | Regenerate `ssot/releases/` from the git tags                                                 |
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
3. If the native projects declare a different marketing version, runs
   `sync-native-version` and commits the result as
   `chore: sync the <version> marketing version into the native projects`.
   Otherwise it makes no commit.
4. Captures `HEAD` as the release commit - the tree the tag will name and the
   artifacts will be built from.
5. Runs `generate-changelog`, then `increment-build-number`.
6. Verifies that `package.json`, Android `versionName`, and every iOS
   `MARKETING_VERSION` name the same version, and fails the release if they do
   not.
7. Stages `CHANGELOG.md` and both native version files, and commits as
   `chore: prepare build <version>-<build number> release`.
8. Creates the annotated tag `build-<version>-<build number>` on the release
   commit captured in step 4, and verifies that the tagged tree declares that
   build number.
9. Pushes the branch and the tag.
10. Publishes the GitHub release `Build <build number>` from that tag, using the
    full changelog range as the body. `BITETRIBE_RELEASE_DRAFT=1` creates it as a
    draft instead. A failure here is reported explicitly with a retry command,
    and does not undo the push that already happened.

Because it pushes, no separate `git push` or `git push --tags` is needed after
it. The tag points at the released source tree, not at the bump commit: see
[The Tag Names What It Contains](#the-tag-names-what-it-contains).

## Native Release Jobs In CI

`.github/workflows/native-release.yml` produces the signed Android bundle and
the signed iOS archive on runners rather than on a workstation. It exists
because a hand-built store artifact is tied to a commit only by convention:
build 92's source had to be reconstructed afterwards from one machine's reflog,
and the answer was `ac217b99` plus an uncommitted change, which is to say no
commit at all. See
[issue #1181][#1181].

### Triggers

| Trigger                 | Behavior                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push of a `build-*` tag | **The release build.** Builds both platforms, retains the artifacts, attaches the provenance to the GitHub release, and uploads to TestFlight and Play Open testing. |
| `workflow_dispatch`     | Same minus the release attachment, with a `platform` choice; uploading is opt-in through `publish`                                                                   |

Publishing is automatic on a tag and opt-in on a dispatch. A `build-*` tag is
only ever created by the release helper, which refuses a dirty tree, refuses an
existing tag, and asserts that the tagged tree declares the build the tag names,
so the tag is already the deliberate act - requiring a second one bought
nothing. Neither upload reaches a tester on its own: a TestFlight build is
invisible until a group is assigned, and a Play release is created as a draft.

A missing store secret skips that upload with a warning instead of failing the
run. The artifacts are the job's product and are already retained by that point,
and throwing them away over an upload nobody configured would be the wrong
trade.

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
double-quoted grep that [Release Workflow](../overview/release-workflow.md) and
[Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md) used to prescribe returns **no
match** on a bundle that is entirely correct. Both pages now warn against it and
defer to the script. A check whose "expected match"
half silently never matches is worse than no check. Which quote form the
minifier picks is not a property the release cares about, so the script does not
care either.

Grepping by hand needs the trailing colon on the key. The bare key name matches
even in a correctly stripped bundle, because the app declares those names as
lookup constants and the minifier keeps them as plain strings: a clean
production build contains `q="NX_APP_BITE_TRIBE_IS_DEV"`. Only the property
form proves a value was inlined.

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

The commit is the checked-out `HEAD`, not `GITHUB_SHA`. On a tag push the two
are the same, but in a run dispatched through `release.yml` `GITHUB_SHA` is the
`develop` commit the dispatch started from, while the job checked out the tag.
Build 100 recorded `6edb512` and named its artifacts after it, although the
tagged tree it was built from was `2613c4e`.

The iOS dSYMs are retained for the same reason. A crash reported against a CI
artifact can then be symbolicated from CI output rather than from whichever
workstation happened to build it.

### R8 And The Crash Mapping

The Android `release` build type runs R8 (`minifyEnabled true`), which shrinks
and obfuscates the Java/Kotlin layer. Its `mapping.txt` reaches both readers
without a step of its own in the workflow:

- AGP embeds it in the bundle as
  `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`, which Play
  reads on upload. That is what clears Play's "no deobfuscation file" warning.
- The Crashlytics Gradle plugin runs `uploadCrashlyticsMappingFileRelease` as
  part of `bundleRelease`, so `npm run release:android` uploads it, in CI and on
  a workstation alike.

`proguard-rules.pro` keeps `SourceFile` and `LineNumberTable`, so a mapped trace
names the line, not just the method. Capacitor's consumer rules keep every
`Plugin` subclass by name with all members, which covers the plugins in
`src/main` and the reflective `SystemBars` lookup in `@capacitor/keyboard`. Two
rules are added on top:

- **The Capacitor annotation types are kept.** Capacitor reads
  `@CapacitorPlugin`, `@Permission` and `@PluginMethod` at runtime, and R8 full
  mode, the AGP 8 default, drops an annotation whose type is not itself kept.
  Without the rule `getPluginAnnotation()` returns null and the first
  `checkPermissions()` call, Geolocation's on the feed, crashes the app on
  launch.
- **`-dontwarn com.facebook.**`.** `@capacitor-firebase/authentication` compiles
  a Facebook handler against an SDK the app deliberately leaves out, since only
  `google.com` and `apple.com` are configured.

A new native plugin that reaches its own classes by reflection or Gson needs its
own keep rule. R8 fails the build on a missing class, but not on a class or
annotation that is only reached at runtime, so an R8 build has to be run on a
device before it ships. [Issue #1449][#1449]

**Test R8 on a non-debuggable build.** For a debuggable build type R8 only
shrinks: it neither obfuscates nor runs full-mode optimization, and it keeps the
annotations. The `qa` type is `initWith debug`, so a `qa` build with
`minifyEnabled true` alone ran cleanly and hid the launch crash above. Add
`debuggable false` as well for the run. A non-debuggable build also logs no
Capacitor plugin traffic, so check results on screen rather than in logcat.

Play's second warning, missing native debug symbols, is accepted. The bundle's
only native libraries are prebuilt AndroidX DataStore and CameraX `.so` files,
shipped already stripped, so there are no symbols to extract. The app also does
not include `firebase-crashlytics-ndk`, so Crashlytics records no native crashes.

### The Tag Names What It Contains

`build-<version>-<x>` points at a tree that declares build `x`, so a
tag-triggered run builds the release rather than something adjacent to it, and
the artifacts come out named to match the tag.

That is a fix, not a given. The release helper used to tag the bump commit,
which already carried `x+1`, so the tag named one build and pointed at another.
The consequences were not theoretical: on the build 96 release the tag run
produced `bitetribe-1.0.1-97-269cb26` artifacts attached to a tag named 96,
which is a foot-gun for anyone fetching "the artifacts for the tag", and it
burned a macOS runner every release on a build nobody wanted. Fixed under issue
[#1441] by capturing the commit before the release writes anything and tagging
that.

The helper asserts the invariant rather than trusting it. After creating the
tag it reads the build number out of the tagged tree through the same
`readBuildNumber` parser the working tree uses, and if the two disagree it
deletes the tag and refuses to push. Against the old `build-1.0.1-96` tag that
check reports 97, which is the bug it exists to prevent.

`build-provenance.json` is attached to the GitHub release on tag runs, because
workflow artifacts expire after 90 days and the release does not. A dispatch run
skips that step: it has no tag, and therefore no release to attach to.

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
[Implementation - Store Release Steps](store-release-steps.md).

`PLAY_SERVICE_ACCOUNT_JSON` is only read when publishing, which is off by
default, so the `play` section can stay unset until a store upload is wanted.

### The Android Track Is Open Testing, As A Draft

The publish step uploads to `beta`, which is **Open testing** in the Play
Developer API, and creates the release as a **draft**.

Both halves were wrong in the first version of this workflow, and both were
taken from the wording of
[issue #1181][#1181]
rather than from the SSOT:

- **Not `internal`.** BiteTribe distributes on Android through Open testing.
  The internal track is paused and abandoned, still holding a February build 58
  and an `Untitled release` draft. [Implementation - Store Listing Assets](store-listing-assets.md)
  records mistaking that paused track for a release blocker as an error already
  made once, and closes with the rule this repeats: check which track the
  product actually ships on.
- **Not `completed`.** The store build notes are produced by summarizing
  `npm run release:notes` to at most 230 characters, by a person, and the
  submission for review is a deliberate click. A completed release would reach
  review carrying no notes. `draft` leaves the console steps in
  [Implementation - Store Release Steps](store-release-steps.md) exactly as they are.

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

| Run | Ref                                               | Trigger       | web-bundle    | android       | ios            |
| --- | ------------------------------------------------- | ------------- | ------------- | ------------- | -------------- |
| #1  | `develop@963e247`                                 | dispatch      | pass, 2.2 min | pass, 5.5 min | fail at export |
| #2  | `1181-fix-native-release-artifact-naming@1cafbd0` | dispatch      | pass, 1.8 min | pass, 5.2 min | pass, 22.9 min |
| #3  | `develop@dcd8d39`                                 | dispatch      | pass, 1.9 min | pass, 5.3 min | pass, 20.5 min |
| #4  | `build-1.0.1-96@269cb26`                          | tag push      | pass, 1.8 min | pass, 5.6 min | -              |
| #5  | `build-1.0.1-97@f301593f`                         | `release.yml` | pass, 2.4 min | pass, 5.8 min | pass, 17.6 min |

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

**Run #5 is the first release actually cut through `release.yml`.** Build 97, on
30 August 2026: `prepare` made the tag and called the build, and all three build
jobs passed on runners with no workstation involved. It was dispatched with
`publish` false, so both native jobs logged "Not publishing: this run did not ask
for it" and the artifacts went to the stores by hand. The path is proven; the
upload steps still are not.

That is the designed behaviour and it costs a runner. Expect one such run after
every release until the ordering question in [Release Workflow](../overview/release-workflow.md) is settled.

Run #1 found two defects, both recorded above: the artifact name emptied by
secret redaction, and an App Store Connect key scoped too narrowly to export.
Its Android bundle was correctly built and signed and then dropped, arriving as
412 bytes of provenance JSON.

Budget the iOS job at roughly 23 minutes and the Android job at 5. The iOS
figure is dominated by `pod install` and the archive, and it is why this
workflow is not on the pull-request path.

### Still Not Verified

- **Neither publish step has ever run.** They are wired and automatic on a tag,
  but no release has used them. The iOS upload has its secrets;
  `PLAY_SERVICE_ACCOUNT_JSON` is still unset, so until it is provisioned the
  Android upload skips with a warning and the bundle is uploaded by hand.
- **No artifact has been installed on a device.** The jobs prove the artifacts
  are produced, signed and named; they do not prove either one runs.
  [issue #1181][#1181]
  asks for an install of each, and that is what remains of it.
- **Part of the R8 build is unverified.** A non-debuggable R8 build of the `qa`
  type, on an emulator against `bite-tribe-qa`, covered App Check, email sign-in,
  the feed, Firestore reads and writes, the camera, the gallery picker, a Bite
  posted with its Storage upload, haptics and the share sheet. Not covered:
  Google and Apple sign-in, which QA cannot do on Android; push registration;
  save-image, which is only reachable through the Instagram and Facebook share
  composer; and a real location fix, since the emulator had none. The first R8
  release should be checked on a device for those before promotion.
  [Issue #1449][#1449]
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
- **App Store approval locks the version it approved.** Once a version is
  approved, `altool` refuses every further binary carrying it:

  ```
  ERROR: [altool] This bundle is invalid. The value for key
  CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a
  higher version than that of the previously approved version [1.0.1]. (90062)
  ```

  It is a server-side rule, so uploading by hand fails the same way, and a
  higher build number does not satisfy it - Apple is comparing the marketing
  version. This is the one case where the marketing version has to move before
  the next release rather than when someone decides the release deserves it.
  Build 97 hit it on 20 September 2026, five days after 1.0.1 cleared review:
  the archive, the export and the Play upload all succeeded and only the
  TestFlight step failed, so the whole cut had to be repeated as 1.0.2 (98).
  Android has no equivalent rule, which is why that half published and the
  draft then had to be discarded to keep the two platforms on one build.

- **The sync has to reach the tagged tree, so the helper commits it before
  capturing that tree.** The tag names the tree the artifacts are built from
  ([#1441]), which is captured before the changelog and the build-number bump.
  A sync that landed only in the `chore: prepare ...` commit would therefore
  build the old version. `commitNativeVersionSyncIfNeeded` runs
  `sync-native-version` first and commits it on the release branch, so the tag
  points at a tree that already carries the new version and the release pull
  request carries the sync back to `develop`. Until build 101 the helper refused
  instead and asked for a separate sync pull request to `develop`, which builds
  99 ([#1857]) and 100 ([#1922]) each needed. Bumping `package.json` on `develop` is
  now the whole edit.

- Do not edit `versionName` or `MARKETING_VERSION` by hand. They are release
  outputs, in the same sense the build number already was.
- Do not reintroduce reading the version out of the native projects into the
  bundle. That is what left `package.json` at `0.0.0` while the app displayed
  and persisted it as a fact (issue [#1303]).
- On a native build the app prefers what `App.getInfo()` reports over the
  build-time value, through `appRelease` in `libs/common/utils`. That is a
  safety net for a skipped or failed sync, not a second source of truth: the web
  build has no native bundle to ask and always reports the build-time value.

## Rules

- Use the existing build-number scripts instead of editing generated release state manually.
- Generate changelog and release notes after the current native build is published, but before incrementing the shared build number for the next development week.
- Run the build-number increment as part of the release helper, which also creates the tag the artifacts are built from. It therefore precedes the build rather than following publication, which reverses the older rule deliberately; see [Release Workflow](../overview/release-workflow.md).
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
  called. See [Architecture - Capacitor](../architecture/capacitor.md).
- Keep source maps and native build artifacts traceable to the release build number and future git tag.
- Run `npm run release:verify-bundle` against `dist/apps/bite-tribe` before
  wrapping it, by hand or in CI. Do not hand-grep for the dev-only keys: the
  quoting the minifier chooses varies, and the documented double-quoted grep
  misses a correct bundle.
- Add a key to `DEV_ONLY_ENV_KEYS` and the release check starts asserting it.
  The check imports that list rather than repeating it.
- Treat generated native files as outputs unless the requested change specifically targets native wrapper source.
- Keep local and CI Node.js versions explicitly aligned as defined by [Current State - Nx And Dependency Migration Roadmap](../current-state/nx-and-dependency-migration-roadmap.md).
- Keep visual regression scripts as direct `oblador/loki` CLI wrappers; do not route them through `nx-loki` or inferred Nx targets.

## Build-Time Environment Variables

Each app owns an `env-var-plugin.js` that calls the shared factory in `tools/env-var-plugin.js`. The factory inlines the collected values into every `process.env` reference, so anything it returns is readable by anyone through browser DevTools.

Rules:

- Add a variable to an app's `allowedKeys` before reading it through `process.env` in app or library code. Nothing is inlined by prefix, so an unlisted variable resolves to `undefined` at runtime.
- Treat the allowlist as the security boundary. It exists so an unrelated `NX_*` variable that happens to be set at build time — an Nx internal such as `NX_WORKSPACE_ROOT`, or a future secret — cannot reach the browser by accident.
- Add any variable that must not reach production to `DEV_ONLY_ENV_KEYS`. `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` is there because a registered debug token bypasses App Check entirely; `NX_APP_BITE_TRIBE_IS_DEV` is there because it routes the app at the emulators.
- Keep values that identify the bundle rather than the deployment in the app plugin's `staticValues`, not in `.env`. `NX_APP_BITE_TRIBE_IS_BUSINESS` is set this way for the business app.
- Firebase web configuration and the reCAPTCHA site key are public by design and stay in the bundle. Access control comes from Firestore rules and App Check, not from hiding these identifiers.

### The Nx Cache Is Not Keyed On These Variables

The `NX_APP_*` values are not part of the build target's task hash, so a bundle
built with a different set of them is a legal cache hit for the same command. A
build written correctly and run with `NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true`
can still return a cached bundle carrying the gate off.

Run 11 of the release-candidate pass hit exactly that, and only the bundle check
caught it. See [Test Run 11 - Android Build 96](../test-runs/11-android-build-96.md) and
[#1428].

Every production build therefore passes `--skip-nx-cache`, in CI and by hand.
The runner starts without an Nx cache today, and this keeps that from being the
reason it is safe.

## Related Pages

- [Release Workflow](../overview/release-workflow.md)
- [Implementation - Store Release Steps](store-release-steps.md)
- [Architecture - Capacitor](../architecture/capacitor.md)
- [Implementation - Testing](testing.md)
- [Implementation - CI Pipeline](ci-pipeline.md)
- [Current State - Release Candidate Test Charter](../current-state/release-candidate-test-charter.md)
- [Current State - Nx And Dependency Migration Roadmap](../current-state/nx-and-dependency-migration-roadmap.md)

[#1181]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1181
[#1303]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1303
[#1428]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1428
[#1441]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1441
[#1449]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1449
[#1857]: https://github.com/muhammedgaygisiz/travellers-apps/pull/1857
[#1922]: https://github.com/muhammedgaygisiz/travellers-apps/pull/1922

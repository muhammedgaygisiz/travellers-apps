# Implementation - Store Release Steps

## Purpose

Store release steps records the manual workstation procedure that turns a synced
native wrapper into a TestFlight build and a Google Play Open Testing release.

Everything on this page is performed by hand in Xcode, Android Studio, App Store
Connect, and the Google Play Console. None of it runs in CI. [Issue #1181](https://github.com/muhammedgaygisiz/travellers-apps/issues/1181)
tracks replacing it with signed, commit-traceable CI artifacts.

[[Release Workflow]] owns the surrounding order. This page owns the console
details that page deliberately does not repeat.

## Entry Condition

Do not start until the release branch exists, the production web bundle has
passed its debug-token check, and both Capacitor syncs have run:

```bash
npx nx build bite-tribe --configuration=production
npm run cap:sync:ios
npx nx run bite-tribe-android:sync
```

The native wrappers bundle `dist/apps/bite-tribe`, so an unsynced wrapper ships
the previous build's web assets without any visible error.

### UTF-8 Requirement For The iOS Sync

`npm run cap:sync:ios` exists for one reason: it pins `LANG` and `LC_ALL` to
`en_US.UTF-8` before handing off to `nx run bite-tribe-ios:sync`.

CocoaPods refuses to run under a non-UTF-8 locale. With `LANG` unset the shell
falls back to `C`, and `pod install` dies inside the sync with

```text
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```

which reads like a CocoaPods bug rather than a missing environment variable.

This is invisible from a normal Terminal session, because an interactive macOS
shell already exports a UTF-8 `LANG`. It appears in exactly the places that do
not: non-interactive shells, agent-driven runs, and CI. It is the same class of
problem as the JDK requirement below — an environment prerequisite that is
silently satisfied when a human runs the command by hand.

`nx run bite-tribe-ios:sync` still works when the shell already has a UTF-8
locale. Prefer the npm script so it works either way.

## iOS - Archive And Upload

1. `npx nx run bite-tribe-ios:open` opens the wrapper in Xcode.
2. **Product → Clean Build Folder**.
3. Set the run destination in the toolbar to **Any iOS Device (arm64)**. An
   attached device or a simulator destination cannot be archived for the store.
4. **Product → Archive** and wait for the archive build to finish.
5. The Archives window opens. Confirm the selected archive shows the expected
   `<version> (<build number>)`, for example `1.0.1 (92)`.
6. **Distribute App → App Store Connect → Distribute**.
7. Wait for `Upload for App Store Connect` to complete, then **Done**.

While the upload runs, start the Android build; the two are independent.

## Android - Signed Bundle

```bash
npm run release:android
```

The signed bundle lands at:

```text
apps/bite-tribe-android/android/app/build/outputs/bundle/release/app-release.aab
```

Gradle signs it directly, so the Android Studio wizard is no longer part of a
release.

`tools/build-android-release.mjs` does three things the raw Gradle target does
not:

1. Resolves a usable JDK, so no `JAVA_HOME` export is needed.
2. Fails when the bundle is unsigned, which is otherwise a silent outcome.
3. Fails when the bundle is signed with the wrong key, before it can be
   uploaded and rejected by Play.

It exits non-zero on any of those, so it is safe to chain.

`npx nx run bite-tribe-android:bundle` remains available as the bare Gradle
target, but it performs none of those checks — prefer the npm script.

### JDK Requirement

Gradle does not accept a JDK newer than 24. A shell whose default is newer — a
Homebrew JDK 25, for example — fails during configuration with
`Unsupported class file major version`. The npm script handles this by searching
`JAVA_HOME`, then the JDK bundled with Android Studio, then any JDK 21 or 17 the
system reports, and it names the problem if none is usable.

Android Studio's own build always used its bundled JDK, which is why the wizard
never hit this.

### Signing Configuration

`apps/bite-tribe-android/android/app/build.gradle` resolves the release signing
config from `apps/bite-tribe-android/android/keystore.properties`, falling back
to environment variables so CI can sign without a file on disk:

| Property        | Environment variable          |
| --------------- | ----------------------------- |
| `storeFile`     | `BITETRIBE_KEYSTORE_FILE`     |
| `storePassword` | `BITETRIBE_KEYSTORE_PASSWORD` |
| `keyAlias`      | `BITETRIBE_KEY_ALIAS`         |
| `keyPassword`   | `BITETRIBE_KEY_PASSWORD`      |

The file is four lines:

```properties
storeFile=/absolute/path/to/bitetribe.jks
storePassword=
keyAlias=First Key
keyPassword=
```

Rules:

- `keystore.properties`, `*.jks`, and `*.keystore` are gitignored. The signing
  key and its passwords must never reach the repository.
- **Do not quote any value.** This is a Java properties file, not a shell
  script: a value runs to the end of the line, so spaces are already preserved.
  Writing `keyAlias="First Key"` makes the alias literally contain the quote
  characters, and signing then fails with a misleading `No key with alias`. A
  literal backslash in a path must be doubled; forward slashes need nothing.
- Capacitor sync does not regenerate `app/build.gradle`, so the signing block
  survives `nx run bite-tribe-android:sync`.
- When neither the file nor the environment variables are present, the release
  build stays **unsigned** rather than failing. That keeps debug work and
  contributors without the key unblocked, but it makes an unsigned bundle a
  silent outcome. `npm run release:android` closes that gap by refusing to
  finish on an unsigned or wrong-key bundle. Verifying by hand:

```bash
jarsigner -verify apps/bite-tribe-android/android/app/build/outputs/bundle/release/app-release.aab
```

`jar verified.` is the expected output. The accompanying PKIX
`unable to find valid certification path` warning is normal and not a problem:
Android upload keys are self-signed, so there is no CA chain to build.

Confirm it is the right key, not merely a key. The upload certificate is:

```text
Owner:  C=CH, ST=Berne, L=Berne, CN=Muhammed Veysel Gaygisiz
SHA256: 34:67:17:77:36:90:77:DD:04:C6:90:9B:D9:22:C2:F8:F6:99:FC:02:D4:28:07:08:12:2C:59:46:50:45:27:AF
Valid:  29 Dec 2025 to 23 Dec 2050
```

```bash
keytool -printcert -jarfile apps/bite-tribe-android/android/app/build/outputs/bundle/release/app-release.aab
```

A different fingerprint means the wrong keystore was used and Play will reject
the upload. The same value appears in the Play Console under
**App signing → Upload key certificate** — not the _App signing key
certificate_ shown beside it, which is Google's own key. BiteTribe is enrolled
in Play App Signing, so this keystore is the upload key only, and Google can
reset it if it is ever lost.

### Android Studio Fallback

Only needed when Gradle signing is unavailable, for example on a machine that
has the key in Android Studio's password store but not in
`keystore.properties`:

1. `npx nx run bite-tribe-android:open`.
2. **Build → Generate Signed App Bundle or APK…** → **Android App Bundle** →
   **Next**.
3. Confirm the key store path, passwords, and alias → **Next**.
4. Select the **release** variant → **Create**, then use the **locate** link in
   the notification to find the `.aab`.

The signing key is a workstation credential either way. It is not in the
repository, and the release cannot be produced on a machine that does not hold
it.

## Store Build Notes

Both stores receive the same text, generated from the changelog produced by
`npm run increment-build-number-and-generate-changelog`.

- Source range: from `### Features` up to, but not including, `### Chores`.
- Summarize that range into user-facing build notes.
- Keep the summary at or under **230 characters** so it fits both the App Store
  Connect _What to Test_ field and the Play Console release-notes field without
  a second edit.

The wider range — `### Features` through the end of `### Chores` — is used for
the GitHub release body, not for store notes. See [[Release Workflow]].

## App Store Connect - TestFlight

1. Open App Store Connect and sign in. The `App upload complete` dialog in Xcode
   links straight there.
2. **Apps → BiteTribe → TestFlight**.
3. Wait until the new build finishes processing.
4. Hover the build row's **GROUPS** cell and click the **+** that appears.
5. Select **External Groups → External Testers**.
6. Paste the store build notes into the **What to Test** modal.
7. **Submit for Review**. External TestFlight distribution is gated on Apple's
   beta app review; internal testers already have the build.

### Encryption Compliance Rule

The build row must **not** show **Missing Compliance**.
`apps/bite-tribe-ios/ios/App/App/Info.plist` declares:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

That answers the export-compliance question at build time, so App Store Connect
stops asking per build. It declares that BiteTribe uses no non-exempt
encryption, which matches the code: there is no cryptography dependency in the
workspace and no proprietary crypto in the wrapper. All encryption is HTTPS/TLS
through the operating system and the Firebase SDKs.

Capacitor sync does not regenerate `Info.plist`, so the declaration survives
every `nx run bite-tribe-ios:sync`.

Before build 93 this was answered by hand for every upload — _App Encryption
Documentation_ → standard encryption algorithms → France **No** → Save. If the
prompt ever reappears, the key has been lost from `Info.plist`; restore it
rather than answering the modal again.

Two consequences to keep in mind:

- Apple no longer asks the France question, but France's own encryption rules
  are not waived by the plist. Revisit before distributing there;
  [[Current State - Release State]] carries that as a launch checklist item.
- The declaration is an export-compliance statement, not a build setting. If
  BiteTribe ever adds its own cryptography, this key has to be re-evaluated —
  the non-exempt path needs `true` plus an `ITSEncryptionExportComplianceCode`.

## Google Play Console - Open Testing

1. Open the Play Console app dashboard in a new tab, keeping App Store Connect
   open.
2. **Test and release → Testing → Open testing**.
3. **Create new release**.
4. Upload the `app-release.aab` located in the Android step and wait for the
   upload to finish.
5. In **Release notes**, replace the placeholder text between the existing
   `<en-US>` tags with the store build notes. Leave the tags themselves intact.
6. **Next**, then **Save**.
7. On the `Go to Publishing overview?` dialog, choose **Go to overview**.
8. Confirm the new release appears in the Changes list, then
   **Submit N changes for review**.
9. Confirm the `Send changes for review?` modal with **Send changes for
   review**.

Play Open Testing releases are not live for testers until Google's review
completes, in the same way TestFlight external distribution waits on Apple.

## Rules

- Produce both artifacts from the same synced working tree. A wrapper synced
  between the iOS archive and the Android bundle produces two artifacts that do
  not correspond to the same web build.
- Confirm the version and build number in the Xcode Archives window before
  distributing. The Organizer is the last point where a stale build number is
  cheap to catch.
- Record the source commit for every uploaded artifact. Neither store exposes
  it, and [[Current State - Release Candidate Test Charter]] needs it to bind a
  test run to code.
- Do not archive from a simulator or device destination, and do not upload a
  debug-variant Android bundle.

## Related Pages

- [[Release Workflow]]
- [[Implementation - Release And Build Workflow]]
- [[Architecture - Capacitor]]
- [[Current State - Release Candidate Test Charter]]
- [[Current State - Release State]]

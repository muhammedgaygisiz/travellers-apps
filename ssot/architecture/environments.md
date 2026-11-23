# Architecture - Environments

## Purpose

Which backends BiteTribe runs against, how a build is pointed at one, and how
a non-production build makes itself recognisable. Firebase surfaces, rules and
functions themselves are in [Architecture - Firebase](firebase.md).

## The Three Stages

| Stage      | Backend                          | How a build gets there                                                                                   |
| ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Dev        | the local Firebase emulators     | a development build (`nx serve`, `nx run bite-tribe-ios:dev`), `NX_APP_BITE_TRIBE_IS_DEV=true`           |
| QA         | `bite-tribe-qa`, disposable data | the QA web apps CI deploys from `develop`, `npm run ios:simulator -- --backend=qa`, `npm run android:qa` |
| Production | `bite-tribe`                     | CI deploys, `native-release.yml`, or `--backend=production` for capture work                             |

There is no separate staging project. QA is the one place to rehearse a
production-shaped change, such as App Check enforcement, before production.

## The QA Project

`bite-tribe-qa` is a second Firebase project with disposable data. It exists
because App Check enforcement could not be rehearsed anywhere else: the emulator
does not enforce App Check, and production is where a failure would be found
(issue [#1221]). The `.firebaserc` alias is `qa`, so
`firebase deploy --only firestore --project qa` targets it.

**Same binary, different backend.** The QA iOS and Android apps are registered
under the production IDs, `com.bitetribe.app`, so App Attest and Play Integrity
attest the build TestFlight and Play ship, and no second App ID or signing setup
exists. Nothing else varies:

| Layer        | Production                                                       | QA                                                                                                                                |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Web bundle   | `--configuration=production`, values from `apps/bite-tribe/.env` | the same configuration, values only from `apps/bite-tribe-firebase/backends/qa.json` (plus `qa.web.json` for the hosted web apps) |
| iOS plist    | `App/App/GoogleService-Info.plist`                               | `ios/firebase/qa/GoogleService-Info.plist`, chosen by the `BITETRIBE_FIREBASE_BACKEND=qa` build setting                           |
| Android json | `app/google-services.json`                                       | `app/src/qa/google-services.json`, used by the `qa` build type (`npm run android:qa`)                                             |

The **Select Firebase Backend** build phase in the App target copies the right
plist into the bundle on every build, the production one included. That way a
production build made after a QA build in the same DerivedData cannot keep the
QA plist. It refuses to archive with `qa`. `qa.json` holds public config only.
The QA web build runs with `NX_LOAD_DOT_ENV_FILES=false`, so nothing from
`apps/bite-tribe/.env` leaks in. An empty shell value is not enough to blank a
`.env` key, because dotenv-expand treats an empty value as unset. The first
QA build shipped the production reCAPTCHA site key that way.

### The QA Web Apps

Since issue [#2293] the consumer, business and admin web apps run on QA too, rebuilt and redeployed by `deploy-qa-web` in `pipeline.yml` after every QA backend deploy from `develop`:

| App      | QA URL                                 | Hosting target on `bite-tribe-qa`                |
| -------- | -------------------------------------- | ------------------------------------------------ |
| Consumer | https://bite-tribe-qa.web.app          | `bite-tribe` → `bite-tribe-qa`                   |
| Business | https://bite-tribe-qa-business.web.app | `bite-tribe-business` → `bite-tribe-qa-business` |
| Admin    | https://bite-tribe-qa-admin.web.app    | `bite-tribe-admin` → `bite-tribe-qa-admin`       |

- **Build:** `npm run build:web:qa` (`tools/build-web-qa.mjs`) builds each app with the production configuration and only `qa.json` plus `qa.web.json`, with `.env` loading off. It then refuses a bundle that does not name `bite-tribe-qa` and the QA site key, or that names production. The same target names map to the QA sites in the root `.firebaserc`, so `firebase.json` is shared with production.
- **`qa.web.json`** holds what only the hosted web apps need: the reCAPTCHA Enterprise site key of the QA key "Bite Tribe QA Web" and the business and admin auth domains. It stays out of `qa.json` because the native QA builds must carry no site key: they get App Check tokens from App Attest and Play Integrity, and `capacitor://localhost` is no reCAPTCHA domain.
- **App Check:** the key is allowed on the three QA sites (`.web.app` and `.firebaseapp.com`) and registered in App Check for the QA web app, which all three apps share. The client gate is on, as in production.
- **Auth:** the three sites are QA's authorized domains. All three apps use `bite-tribe-qa.firebaseapp.com` as their auth domain, as production's apps share `bite-tribe.firebaseapp.com`.
- **Credential:** the QA deploy account also holds `roles/firebasehosting.admin` on `bite-tribe-qa`, granted by `tools/set-functions-deploy-service-account.sh` for QA only.
- **Purpose:** QA test runs of the real builds (the launch test [#1957]), and the smoke test before a release ([#2294]).

### QA Test Data

`npm run seed:qa` (`tools/seed-qa.mjs`, issue [#2294]) puts the QA project into the state a test run starts from. It is idempotent: every run updates the same accounts and overwrites the same documents, so it also resets QA after a run.

| What       | Id                                               | Notes                                                                                       |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Owner      | `qa-owner`, `qa-owner@bitetribe.app`             | claim `business`, owns QA Trattoria                                                         |
| Staff      | `qa-staff`, `qa-staff@bitetribe.app`             | claim `staff`, `restaurantStaff/qa-staff` points to QA Trattoria                            |
| Guest      | `qa-guest`, `qa-guest@bitetribe.app`             | no role, onboarding marked done                                                             |
| Admin      | `qa-admin`, `qa-admin@bitetribe.app`             | claim `admin`                                                                               |
| Restaurant | `qa-trattoria`, menu `qa-menu-trattoria`         | EUR menu with variants, a required option group, an extra and dietary labels; open all week |
| Table      | `qa-table-1`, token `QAQAQAQAQAQAQAQAQAQAQAQA01` | table ordering on, an open visit, so `/t/<token>` can order right away                      |

- **Credentials:** `GOOGLE_APPLICATION_CREDENTIALS` when set (CI), otherwise the local `gcloud` login. It talks to the Identity Toolkit and Firestore admin REST APIs, which App Check does not gate.
- **Passwords:** the QA sites are public, so the accounts get generated passwords, not the emulator's shared one. The script writes them to `apps/bite-tribe-firebase/.qa-accounts.env` (gitignored) on its first run and reuses them; `QA_<ROLE>_PASSWORD` variables override the file, which is how CI will pass them. It never prints them.

There is deliberately no simulator-specific Angular configuration. Issue
1219 lived only in the production bundle, so a separate bundle would rebuild
that blind spot.

## Telling The Stages Apart

A dev or QA build says so in three places, and production shows none of them.
**Dev** means the local emulators. **QA** means `bite-tribe-qa`.

| Surface             | Dev                                           | QA                                        | Mechanism                                                                   |
| ------------------- | --------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| UI                  | purple `DEV` corner ribbon                    | orange `QA` corner ribbon                 | `StageRibbonComponent` in `ta-firestore`, in the root of all three web apps |
| App icon            | iOS `AppIcon-Dev`; Android `debug` build type | iOS `AppIcon-QA`; Android `qa` build type | asset sets made by `tools/generate-stage-icons.mjs`                         |
| Mail from functions | `[DEV]` subject, purple banner                | `[QA]` subject, orange banner             | `markEmailForStage` in `createRawMessage`                                   |

- **No new environment key.** The client's `resolveDeploymentStage` reads
  `NX_APP_BITE_TRIBE_IS_DEV`, which production bundles strip, and the project
  ID. The functions' version reads `FUNCTIONS_EMULATOR` and the runtime's
  project (`GCLOUD_PROJECT`, then `FIREBASE_CONFIG`). An unknown project counts
  as production, so a production mail is never branded as a test.
- **The ribbon ignores pointer events** and changes no layout. Storybook has no
  stage, so Loki never captures it.
- **The iOS icon is a Debug-only setting.** Debug's
  `ASSETCATALOG_COMPILER_APPICON_NAME` is `$(BITETRIBE_APP_ICON:default=AppIcon)`,
  and Release hard-codes `AppIcon`, so an archive carries the production icon
  even when the variable is set. `npm run ios:simulator` passes it per backend,
  and `nx run bite-tribe-ios:dev` sets `AppIcon-Dev` through the environment,
  which xcodebuild reads as a build setting.
- **Android picks the icon by build type.** `debug` takes `app/src/debug/res`
  (DEV) and `qa` takes `app/src/qa/res` (QA). Release uses `app/src/main/res`.
  The `qa` build type is `initWith debug` with the same application ID, so it
  matches the QA Firebase Android app. It shares the debug App Check provider
  through `qa.java.srcDirs += 'src/debug/java'` and `qaImplementation` of
  `firebase-appcheck-debug`, and its library modules fall back to `debug`.
  Register the debug secret it logs on first launch on the `bite-tribe-qa`
  Android app, never on production.
- **Firebase Auth's own mails** (registration verification, password reset)
  come from the QA project's templates, and those cannot be branded: the Admin
  API answers `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, and the console says
  "Email template updates are currently unavailable for this project" (a
  restriction on new projects, lifted only through Firebase Support). They are
  still distinguishable: the sender is `noreply@bite-tribe-qa.firebaseapp.com`
  with no display name, and the action link points at
  `bite-tribe-qa.firebaseapp.com`, where production shows "Bite Tribe" and
  `bite-tribe.firebaseapp.com`. The resend button's mail goes through the
  functions and carries the `[QA]` mark.

Regenerate the icons whenever the production icon changes:

```bash
node tools/generate-stage-icons.mjs
```

## App Check Enforcement On QA

QA enforces App Check exactly like production: on Authentication, Firestore and
Storage at the server, and with the client gate on (`NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED`
is `true` in `qa.json`, as `native-release.yml` sets it for production native
builds). A QA build therefore needs a registered debug token, on the matching
QA app, before it can do anything.

| Platform           | Token                                                                                              | Registered under                            |
| ------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| iOS simulator      | `BITETRIBE_IOS_APP_CHECK_DEBUG_TOKEN` in `apps/bite-tribe-ios/.env`, passed at launch              | App Check, iOS app, Manage debug tokens     |
| Android `qa` build | the secret the debug provider logs on first launch (`Enter this debug secret into the allow list`) | App Check, Android app, Manage debug tokens |

The Android secret lives in the app's data, so **a reinstall over a different
build, or clearing the app's data, makes a new one**. Register it again.

### Rehearsal, 9 November 2026

- iOS simulator: sign-up, every onboarding step, the profile photo upload to
  Storage and the resend-verification callable all succeeded under
  enforcement. Every callable logged `Callable request verification passed`.
- Android emulator: sign-in and the feed succeeded under enforcement. An
  unregistered secret ended on the "Extra security check needed" gate, as
  designed.
- No token at all: QA Authentication answered
  `401 Firebase App Check token is invalid.`

### Limits Of QA On Android

- **Google sign-in does not work against QA on Android.** An Android OAuth
  client for `com.bitetribe.app` with a given certificate can exist in only one
  Google project, and production holds it, so QA's Android app has the two
  SHA-256 fingerprints (Play Integrity) but not the SHA-1s. Email and password
  work. iOS is unaffected.
- **Emulator traps.** After a cold boot the app's DNS can fail while the shell
  resolves (`Unable to resolve host`); start the emulator with
  `-dns-server 8.8.8.8`. Booting without `-no-snapshot-load` restores the AVD's
  quick-boot snapshot, including whatever build was installed then.

## Native API Key

In a packaged native build the WebView origin is `capacitor://localhost`, and
the Firebase JS SDK sends it as the referrer. The web API key is restricted to
HTTP referrers, which cannot express that scheme, so Firebase Installations
answered `403 PERMISSION_DENIED`. That took Analytics, Remote Config, FCM and
web App Check down with it on native. The native plugins were unaffected,
because they authenticate by bundle ID against the plist key.

The fix is a separate key, restricted by API rather than by referrer, used only
by native builds. The web key keeps its referrer lock. `native-release.yml`
reads it from the `NX_APP_BITE_TRIBE_NATIVE_API_KEY` secret and falls back to
the web key while that secret is unset. Live reload does not avoid the problem:
`cap run ios -l` only changes the origin to a LAN IP.

## Provisioning State

Recorded on 9 November 2026, when the project was set up:

- Done: the iOS, Android and web apps under the production IDs (the two
  original `com.bitetribe.app.qa` apps were removed), Firestore `(default)` in
  `eur3` like production, and Firestore rules and indexes deployed.
- Done once billing was linked: Authentication initialised as Identity
  Platform with email sign-in, Google sign-in, and the Storage bucket in
  `US-CENTRAL1` (production's location) with its rules deployed. The QA plist
  was re-downloaded so it carries `CLIENT_ID`, and `Info.plist` lists the QA
  `REVERSED_CLIENT_ID` as a second URL scheme in every build, so the shipped
  binary stays the one QA runs.
- Native API key: both projects have a "Native WebView key
  (capacitor://localhost)" restricted by API only. The production one is the
  `NX_APP_BITE_TRIBE_NATIVE_API_KEY` secret; the QA one is in `qa.json`.
- CI: `deploy-qa-backend` in `pipeline.yml` deploys Firestore rules and
  indexes, Storage rules and functions to QA on every push to `develop`,
  independent of the production deploys. Its credential is
  `functions-deploy@bite-tribe-qa`, stored as
  `FIREBASE_SERVICE_ACCOUNT_BITE_TRIBE_QA` by
  `FIREBASE_PROJECT_ID=bite-tribe-qa bash tools/set-functions-deploy-service-account.sh`.
  It has no rights on production.
- Function secrets: `GOOGLE_GEOCODING_API_KEY` is QA's own Maps key, limited to
  Geocoding and Places. The four `GOOGLE_WORKSPACE_*` secrets are copies of
  production's, so **QA sends real mail from the production sender address**.
  Re-copy them whenever production rotates.
- First deploy, 9 November 2026: 85 of 111 functions went live and the 26
  Firestore-triggered ones failed with `Invalid resource state` on their
  Eventarc trigger. That is a new project's Eventarc service agent still
  propagating its permissions, and a plain retry minutes later created them
  all. The same run set the Artifact Registry cleanup policy (`--force`, once,
  by hand). Without that policy `firebase deploy` exits non-zero even after a
  clean deploy, which would have failed the CI job on every push.
- First CI run, 9 November 2026: `deploy-qa-backend` failed with
  `403 The caller does not have permission` on
  `identitytoolkit … config?updateMask=blockingFunctions`. The QA project had
  `beforeCreate` registered under the old `cloudfunctions.net` URL, so the
  deploy tried to rewrite the Auth config to the `run.app` one, and the deploy
  account has no Identity Toolkit admin role. Neither project's deploy
  account needs one as long as the registered URL already matches.
  Production's was rewritten once by an owner on 5 September 2026; QA's by
  redeploying `createUserOnAuthCreate` as an owner, after which the re-run
  passed. **On a new project, or after moving the function's region, deploy
  `beforeCreate` once as an owner before CI deploys it.**

## Code Anchors

```text
apps/bite-tribe-firebase/.firebaserc
apps/bite-tribe-firebase/backends/qa.json
apps/bite-tribe-firebase/functions/src/functions/shared/utils/deployment-stage.ts
apps/bite-tribe-ios/ios/firebase/select-firebase-backend.sh
apps/bite-tribe-ios/ios/firebase/qa/GoogleService-Info.plist
apps/bite-tribe-android/android/app/src/qa
libs/common/ta-firestore/src/lib/deployment-stage
tools/firebase-backend-env.mjs
tools/generate-stage-icons.mjs
tools/run-android-qa.mjs
tools/run-ios-simulator.mjs
tools/seed-qa.mjs
tools/set-functions-deploy-service-account.sh
.github/workflows/pipeline.yml (deploy-qa-backend)
```

## Related

- [Architecture - Firebase](firebase.md)
- [Architecture - Capacitor](capacitor.md)
- [Implementation - iOS Simulator Testing](../implementation/ios-simulator-testing.md)

[#1221]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1221
[#2293]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2293
[#2294]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2294
[#1957]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1957

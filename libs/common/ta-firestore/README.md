# ta-firestore

This library was generated with [Nx](https://nx.dev).

## Firebase App Check

BiteTribe initializes Firebase App Check from
`src/lib/initialize-firebase-app-check.ts`. `provideFirestoreUtils` registers an
Angular app initializer that waits for the App Check initialization attempt
before normal app bootstrap continues into NgRx effects and Firebase-backed
feature code.

The web app uses the Capawesome `@capacitor-firebase/app-check` plugin with
Firebase's `ReCaptchaEnterpriseProvider`. The iOS app installs the native App
Attest provider before `FirebaseApp.configure()` in
`apps/bite-tribe-ios/ios/App/App/AppDelegate.swift`. The Android app installs
the native Play Integrity provider in
`apps/bite-tribe-android/android/app/src/main/java/com/bitetribe/app/MainActivity.java`.
The JavaScript SDK is then initialized with a `CustomProvider` that retrieves
native tokens through `FirebaseAppCheck.getToken(...)` on both native platforms.

The web reCAPTCHA Enterprise score-based site key is read from:

```bash
NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY
```

The key is a public site key, but it must still be configured through the build
environment instead of being hardcoded in frontend code. The BiteTribe
`env-var-plugin.js` exposes `NX_*` variables to `process.env` during the web
build.

### Environment variables

| Variable                                  | Purpose                                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY`    | Public reCAPTCHA Enterprise site key. Required whenever App Check initializes because it configures the App Check provider.                                      |
| `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` | Sensitive registered Firebase debug token. Optional, local-only, and used for trusted `localhost` production-Firebase testing. It does not replace the site key. |

### Runtime modes

| Mode                          | Required environment                                                             | App Check behavior                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Web local simulators          | `NX_APP_BITE_TRIBE_IS_DEV=true`                                                  | Skipped quietly. No site key or debug token is needed.                                                                       |
| Web local production Firebase | `NX_APP_BITE_TRIBE_IS_DEV=false` plus `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY=...` | Runs with the regular site key. Use `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN=...` for `localhost`.                           |
| Web production build          | `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY=...`                                       | Runs with the regular site key. Do not provide a debug token. `NX_APP_BITE_TRIBE_IS_DEV` is omitted from production bundles. |
| iOS production/TestFlight     | Firebase Console iOS App Check registration plus App Attest capability           | Uses native App Attest tokens bridged into the Firebase JavaScript SDK.                                                      |
| Android production/internal   | Firebase Console Android App Check registration plus Play Integrity provider     | Uses native Play Integrity tokens bridged into the Firebase JavaScript SDK.                                                  |

When `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY` is not configured, initialization is
also skipped. This keeps localhost development working while Firebase App Check
enforcement remains disabled.

### Transitional startup telemetry

The current startup policy is transitional: the app waits for the App Check
initialization attempt, records telemetry when available, and continues startup
if initialization fails. App Check enforcement must not be enabled until the
future blocking/retry behavior is implemented.

App Check emits Firebase Analytics events in production-like modes when
Analytics is available:

- `app_check_startup_started`
- `app_check_startup_completed`
- `app_check_skipped`
- `app_check_initialization_failed`

Event parameters are limited to startup metadata such as platform, runtime mode,
provider, reason, duration, site-key/debug-token presence booleans, and the
transitional policy. Token values, debug token values, user IDs, and raw
attestation payloads must never be logged.

Console logs are intentionally limited:

- dev/simulator mode emits no App Check logging noise.
- local production-Firebase testing may emit `[AppCheck]` console logs for
  debugging.
- production builds emit Analytics events but no App Check console logs.

After deploying a build with the site key configured, verify requests in
Firebase Console under **Build > App Check** for the relevant BiteTribe app. Use
the request metrics there to confirm valid App Check traffic before enabling any
enforcement.

### iOS App Attest setup

Register the BiteTribe iOS app in Firebase Console under
**Build > App Check** and select the App Attest provider. App Check enforcement
must remain disabled until all platforms are validated.

In Xcode, confirm the BiteTribe app target has the App Attest capability:

```text
Target
-> Signing & Capabilities
-> App Attest
```

The checked-in entitlement is:

```xml
<key>com.apple.developer.devicecheck.appattest-environment</key>
<string>production</string>
```

Firebase App Check currently expects App Attest production tokens, so this value
should not be changed to a sandbox environment.

The iOS startup order is:

```text
AppDelegate
-> AppCheck.setAppCheckProviderFactory(...)
-> FirebaseApp.configure()
-> Angular provideFirestoreUtils(...)
-> Firebase JS SDK initializeAppCheck(...) with CustomProvider
-> Firestore / Storage / Functions
```

The native debug provider is not enabled in code. If debug tokens are needed for
a future local-device workflow, register them in Firebase Console and keep token
values in local developer configuration only. Never commit debug token values.

### Android Play Integrity setup

Register or verify the BiteTribe Android app in Firebase Console under
**Build > App Check** and select the Play Integrity provider. App Check
enforcement must remain disabled until request metrics are healthy after
deployment.

The Android startup order is:

```text
MainActivity
-> FirebaseAppCheck.installAppCheckProviderFactory(...)
-> Angular provideFirestoreUtils(...)
-> Firebase JS SDK initializeAppCheck(...) with CustomProvider
-> Firestore / Storage / Functions
```

After deployment, verify App Check request metrics for the Android app in
Firebase Console before enabling enforcement.

### Local production Firebase testing

Use a debug token when testing the local web app against production Firebase
from `localhost`. Do not add `localhost` to the reCAPTCHA Enterprise allowed
domains.

For `localhost` with production Firebase, provide both the site key and the
debug token.

Create or register the token in Firebase Console:

1. Open **Security > App Check > Apps**.
2. Select the BiteTribe web app menu.
3. Open **Manage debug tokens**.
4. Create or register a local developer token.

Run the local app with production Firebase and the registered debug token:

```bash
NX_APP_BITE_TRIBE_IS_DEV=false
NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY=...
NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN=...
```

The debug token is sensitive because Firebase backend services accept it without
normal reCAPTCHA Enterprise attestation. Store it only in your local shell or a
local ignored env file. Do not commit it, and revoke it from Firebase Console if
it is exposed.

Simulator mode does not need a debug token.

The debug token is passed through:

```bash
NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN
```

## Running unit tests

Run `nx test ta-firestore` to execute the unit tests.

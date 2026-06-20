# ta-firestore

This library was generated with [Nx](https://nx.dev).

## Firebase App Check

BiteTribe web initializes Firebase App Check from
`src/lib/initialize-firebase-app-check.ts`. `provideFirestoreUtils` calls the
initializer immediately after `initializeApp(...)` and before Firestore, Auth,
Storage, or Firebase simulator setup is used.

The web app uses the Capawesome `@capacitor-firebase/app-check` plugin with
Firebase's `ReCaptchaEnterpriseProvider`. The reCAPTCHA Enterprise score-based
site key is read from:

```bash
NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY
```

The key is a public site key, but it must still be configured through the build
environment instead of being hardcoded in frontend code. The BiteTribe
`env-var-plugin.js` exposes `NX_*` variables to `process.env` during the web
build.

When `NX_APP_BITE_TRIBE_IS_DEV=true`, the client connects to Firebase
simulators and App Check initialization is skipped even if a site key is
configured. When the flag is absent or any value other than `true`, the client
uses the production Firebase path and App Check initializes if
`NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY` is configured.

When `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY` is not configured, initialization is
also skipped with an `[AppCheck]` info log. This keeps localhost development
working while Firebase App Check enforcement remains disabled.

Initialization success and failure are logged with the `[AppCheck]` prefix. A
failure is caught and does not block application startup.

After deploying a build with the site key configured, verify requests in
Firebase Console under **Build > App Check** for the BiteTribe web app. Use the
request metrics there to confirm valid App Check traffic before enabling any
enforcement.

Debug token registration is intentionally out of scope for the first rollout.
The initializer is ready to pass a predefined web debug token later through:

```bash
NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN
```

Only set a debug token for trusted development or CI builds, and register that
token in Firebase Console before relying on it.

## Running unit tests

Run `nx test ta-firestore` to execute the unit tests.

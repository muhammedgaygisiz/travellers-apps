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

### Environment variables

| Variable                                  | Purpose                                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY`    | Public reCAPTCHA Enterprise site key. Required whenever App Check initializes because it configures the App Check provider.                                      |
| `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN` | Sensitive registered Firebase debug token. Optional, local-only, and used for trusted `localhost` production-Firebase testing. It does not replace the site key. |

### Runtime modes

| Mode                      | Required environment                                                             | App Check behavior                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Local simulators          | `NX_APP_BITE_TRIBE_IS_DEV=true`                                                  | Skipped. No site key or debug token is needed.                                                                               |
| Local production Firebase | `NX_APP_BITE_TRIBE_IS_DEV=false` plus `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY=...` | Runs with the regular site key. Use `NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN=...` for `localhost`.                           |
| Production build          | `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY=...`                                       | Runs with the regular site key. Do not provide a debug token. `NX_APP_BITE_TRIBE_IS_DEV` is omitted from production bundles. |

When `NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY` is not configured, initialization is
also skipped with an `[AppCheck]` info log. This keeps localhost development
working while Firebase App Check enforcement remains disabled.

Initialization success and failure are logged with the `[AppCheck]` prefix. A
failure is caught and does not block application startup.

After deploying a build with the site key configured, verify requests in
Firebase Console under **Build > App Check** for the BiteTribe web app. Use the
request metrics there to confirm valid App Check traffic before enabling any
enforcement.

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

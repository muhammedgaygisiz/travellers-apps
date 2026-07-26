const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// The native wrappers own the shared build number, so both web apps read it
// from the bite-tribe Android and iOS projects.
const { readBuildNumber } = require('../apps/bite-tribe/read-build-number');

/**
 * Firebase configuration shared by both apps.
 *
 * Most of these are public by design: the Firebase client SDK cannot work
 * without them, and Google documents the web API key and the reCAPTCHA site
 * key as identifiers rather than credentials. Access control comes from
 * Firestore rules and App Check.
 *
 * The two entries listed in {@link DEV_ONLY_ENV_KEYS} are the exception. They
 * are allowlisted so local and emulator builds keep working, and stripped
 * again before they can reach a production bundle.
 */
const FIREBASE_ENV_KEYS = [
  'NX_APP_BITE_TRIBE_API_KEY',
  'NX_APP_BITE_TRIBE_PROJECT_ID',
  'NX_APP_BITE_TRIBE_STORAGE_BUCKET',
  'NX_APP_BITE_TRIBE_MESSAGING_SENDER_ID',
  'NX_APP_BITE_TRIBE_MEASSUREMENT_ID',
  'NX_APP_BITE_TRIBE_APP_ID',
  'NX_APP_BITE_TRIBE_APP_CHECK_SITE_KEY',
  'NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED',
  'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN',
  'NX_APP_BITE_TRIBE_IS_DEV',
];

/**
 * Keys that must never reach a production bundle.
 *
 * `APP_CHECK_DEBUG_TOKEN` is a real credential: a token registered in the
 * Firebase console bypasses App Check entirely, so shipping it to the browser
 * would defeat the enforced-mode gate. `IS_DEV` only routes the app at the
 * emulators and is stripped so a production build cannot be flipped into it.
 */
const DEV_ONLY_ENV_KEYS = [
  'NX_APP_BITE_TRIBE_APP_CHECK_DEBUG_TOKEN',
  'NX_APP_BITE_TRIBE_IS_DEV',
];

/**
 * Builds the object esbuild inlines into every `process.env` reference.
 *
 * Keys are opted in explicitly rather than matched by prefix. A prefix match
 * also inlines Nx internals (`NX_WORKSPACE_ROOT` leaks the build machine path,
 * `NX_TASK_HASH`, `NX_INVOCATION_ROOT_PID`) and, more importantly, silently
 * ships any future `NX_*` secret that happens to be set at build time.
 */
function collectPublicEnv({
  allowedKeys,
  devOnlyKeys = [],
  staticValues = {},
  env,
  isProduction,
}) {
  const publicEnv = {};

  for (const key of allowedKeys) {
    if (isProduction && devOnlyKeys.includes(key)) {
      continue;
    }

    if (env[key] !== undefined) {
      publicEnv[key] = env[key];
    }
  }

  return { ...publicEnv, ...staticValues };
}

/**
 * Reads the release metadata rendered by the shared app menu and about page.
 */
function readAppMetadata(workspaceRoot) {
  const { version } = JSON.parse(
    readFileSync(join(workspaceRoot, 'package.json'), 'utf8'),
  );

  return { version, buildNumber: readBuildNumber(workspaceRoot) };
}

/**
 * Creates the esbuild plugin that inlines build-time configuration.
 *
 * Each app passes its own allowlist and static values so the two bundles stay
 * independent instead of sharing one app's configuration.
 */
function createEnvVarPlugin({
  allowedKeys,
  devOnlyKeys = DEV_ONLY_ENV_KEYS,
  staticValues = {},
  workspaceRoot,
}) {
  return {
    name: 'env-var-plugin',
    setup(build) {
      const options = build.initialOptions;

      const publicEnv = collectPublicEnv({
        allowedKeys,
        devOnlyKeys,
        staticValues: { ...staticValues, ...readAppMetadata(workspaceRoot) },
        env: process.env,
        isProduction: process.env.NX_TASK_TARGET_CONFIGURATION === 'production',
      });

      options.define ??= {};
      options.define['process.env'] = JSON.stringify(publicEnv);
    },
  };
}

module.exports = {
  createEnvVarPlugin,
  collectPublicEnv,
  FIREBASE_ENV_KEYS,
  DEV_ONLY_ENV_KEYS,
};

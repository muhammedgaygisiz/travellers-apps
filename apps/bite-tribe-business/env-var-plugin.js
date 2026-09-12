const { join } = require('node:path');
const {
  createEnvVarPlugin,
  FIREBASE_ENV_KEYS,
} = require('../../tools/env-var-plugin');

const workspaceRoot = join(__dirname, '../..');

module.exports = createEnvVarPlugin({
  workspaceRoot,
  allowedKeys: [...FIREBASE_ENV_KEYS, 'NX_APP_BITE_TRIBE_BUSINESS_AUTH_DOMAIN'],
  // Compiled in rather than supplied per environment: the flag identifies the
  // bundle, not the deployment. It is what `AnalyticsService` routes events by
  // - the consumer taxonomy is dropped here and the table operations of issue
  // #1098 are sent - and what keeps the Crashlytics guard in `AuthService`
  // no-opping in the business app.
  staticValues: { NX_APP_BITE_TRIBE_IS_BUSINESS: 'true' },
});

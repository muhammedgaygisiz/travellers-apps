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
  // bundle, not the deployment. It gates the analytics and Crashlytics guards
  // in `AnalyticsService` and `AuthService`, which no-op in the business app.
  staticValues: { NX_APP_BITE_TRIBE_IS_BUSINESS: 'true' },
});

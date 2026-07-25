const { join } = require('node:path');
const {
  createEnvVarPlugin,
  FIREBASE_ENV_KEYS,
} = require('../../tools/env-var-plugin');

const workspaceRoot = join(__dirname, '../..');

module.exports = createEnvVarPlugin({
  workspaceRoot,
  allowedKeys: [
    ...FIREBASE_ENV_KEYS,
    'NX_APP_BITE_TRIBE_AUTH_DOMAIN',
    // Called directly from the browser by the reverse-geocoding service, so it
    // has to be inlined. Restrict it by referrer in the Geoapify dashboard.
    'NX_APP_GEOAPIFY_API_KEY',
  ],
});

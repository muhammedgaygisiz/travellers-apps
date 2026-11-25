const { join } = require('node:path');
const {
  createEnvVarPlugin,
  FIREBASE_ENV_KEYS,
} = require('../../tools/env-var-plugin');

const workspaceRoot = join(__dirname, '../..');

// The creator app signs in against its own hosting domain, so it opts into
// that one key on top of the shared Firebase set, as the business and admin
// apps do. Which app the bundle is comes from `environment.isCreator`.
module.exports = createEnvVarPlugin({
  workspaceRoot,
  allowedKeys: [...FIREBASE_ENV_KEYS, 'NX_APP_BITE_TRIBE_CREATOR_AUTH_DOMAIN'],
});

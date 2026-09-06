const { join } = require('node:path');
const {
  createEnvVarPlugin,
  FIREBASE_ENV_KEYS,
} = require('../../tools/env-var-plugin');

const workspaceRoot = join(__dirname, '../..');

// The admin app signs in against its own hosting domain, so it opts into that
// one key on top of the shared Firebase set. Which app the bundle is comes from
// `environment.isAdmin` rather than from a compiled-in flag: nothing reads the
// equivalent `NX_APP_BITE_TRIBE_IS_BUSINESS` the business app writes, and a
// second unread marker would only look load-bearing.
module.exports = createEnvVarPlugin({
  workspaceRoot,
  allowedKeys: [...FIREBASE_ENV_KEYS, 'NX_APP_BITE_TRIBE_ADMIN_AUTH_DOMAIN'],
});

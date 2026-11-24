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
    // The QA site in QA builds; unset, links name bitetribe.app (#2304).
    'NX_APP_BITE_TRIBE_LINK_ORIGIN',
  ],
});

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { readBuildNumber } = require('./read-build-number');

const workspaceRoot = join(__dirname, '../..');
const myOrgEnvRegex = /^NX_/i;

const envVarPlugin = {
  name: 'env-var-plugin',
  setup(build) {
    const options = build.initialOptions;

    const envVars = {};
    for (const key in process.env) {
      if (myOrgEnvRegex.test(key)) {
        envVars[key] = process.env[key];
      }
    }

    if (process.env.NX_TASK_TARGET_CONFIGURATION === 'production') {
      delete envVars.NX_APP_BITE_TRIBE_IS_DEV;
    }

    const { version } = JSON.parse(
      readFileSync(join(workspaceRoot, 'package.json'), 'utf8'),
    );
    envVars.version = version;
    envVars.buildNumber = readBuildNumber(workspaceRoot);

    options.define ??= {};
    options.define['process.env'] = JSON.stringify(envVars);
  },
};

module.exports = envVarPlugin;

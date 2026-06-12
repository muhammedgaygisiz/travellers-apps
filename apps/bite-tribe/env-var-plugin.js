const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const workspaceRoot = join(__dirname, '../..');
const myOrgEnvRegex = /^NX_/i;

function readBuildNumber() {
  const androidBuildGradle = readFileSync(
    join(workspaceRoot, 'apps/bite-tribe-android/android/app/build.gradle'),
    'utf8',
  );
  const iosProject = readFileSync(
    join(
      workspaceRoot,
      'apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj',
    ),
    'utf8',
  );

  const androidBuildNumber = androidBuildGradle.match(
    /^\s*versionCode\s+(\d+)\s*$/m,
  )?.[1];
  const iosBuildNumbers = [
    ...iosProject.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g),
  ].map((match) => match[1]);
  const buildNumbers = new Set([androidBuildNumber, ...iosBuildNumbers]);

  if (
    !androidBuildNumber ||
    iosBuildNumbers.length === 0 ||
    buildNumbers.size !== 1
  ) {
    throw new Error('Android and iOS build numbers must exist and match.');
  }

  return androidBuildNumber;
}

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

    const { version } = JSON.parse(
      readFileSync(join(workspaceRoot, 'package.json'), 'utf8'),
    );
    envVars.version = version;
    envVars.buildNumber = readBuildNumber();

    options.define ??= {};
    options.define['process.env'] = JSON.stringify(envVars);
  },
};

module.exports = envVarPlugin;

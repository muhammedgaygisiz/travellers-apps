const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function readBuildNumber(workspaceRoot, readFile = readFileSync) {
  const androidBuildGradle = readFile(
    join(workspaceRoot, 'apps/bite-tribe-android/android/app/build.gradle'),
    'utf8',
  );
  const iosProject = readFile(
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

module.exports = { readBuildNumber };

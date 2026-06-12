import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const androidBuildGradlePath = resolve(
  'apps/bite-tribe-android/android/app/build.gradle',
);
const iosProjectPath = resolve(
  'apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj',
);

const androidBuildGradle = readFileSync(androidBuildGradlePath, 'utf8');
const iosProject = readFileSync(iosProjectPath, 'utf8');

const androidBuildNumberMatch = androidBuildGradle.match(
  /^(\s*versionCode\s+)(\d+)(\s*)$/m,
);
const iosBuildNumberMatches = [
  ...iosProject.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g),
];

if (!androidBuildNumberMatch || iosBuildNumberMatches.length === 0) {
  throw new Error('Could not find the Android or iOS build number.');
}

const androidBuildNumber = Number(androidBuildNumberMatch[2]);
const iosBuildNumbers = new Set(
  iosBuildNumberMatches.map((match) => Number(match[1])),
);

if (iosBuildNumbers.size !== 1 || !iosBuildNumbers.has(androidBuildNumber)) {
  throw new Error(
    'Android and iOS build numbers must match before incrementing.',
  );
}

const nextBuildNumber = androidBuildNumber + 1;

writeFileSync(
  androidBuildGradlePath,
  androidBuildGradle.replace(
    /^(\s*versionCode\s+)\d+(\s*)$/m,
    `$1${nextBuildNumber}$2`,
  ),
);
writeFileSync(
  iosProjectPath,
  iosProject.replace(
    /CURRENT_PROJECT_VERSION = \d+;/g,
    `CURRENT_PROJECT_VERSION = ${nextBuildNumber};`,
  ),
);

console.log(`Build number incremented to ${nextBuildNumber}.`);

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The marketing version lives in `package.json` and nowhere else.
 *
 * The native projects and the bundle are both downstream of it: the bundle
 * inlines it through `tools/env-var-plugin.js`, and the release writes it into
 * the Android and iOS projects with {@link writeNativeVersion}. Before issue
 * #1303 the direction was reversed, so `package.json` stayed at `0.0.0` and the
 * app rendered and persisted that placeholder as if it were a fact.
 */
export const ANDROID_BUILD_GRADLE_PATH =
  'apps/bite-tribe-android/android/app/build.gradle';

export const IOS_PROJECT_PATH =
  'apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj';

export function readPackageVersion(workspaceRoot = process.cwd()) {
  const { version } = JSON.parse(
    readFileSync(resolve(workspaceRoot, 'package.json'), 'utf8'),
  );

  if (!version || version === '0.0.0') {
    throw new Error(
      'package.json must carry the marketing version; found ' +
        `"${version ?? ''}".`,
    );
  }

  return version;
}

/**
 * Reads the version the native projects currently declare.
 *
 * This used to be the release's input. It is now its post-condition: the two
 * projects must still agree with each other and with `package.json` after the
 * release wrote them.
 */
export function readNativeVersion(workspaceRoot = process.cwd()) {
  const androidBuildGradle = readFileSync(
    resolve(workspaceRoot, ANDROID_BUILD_GRADLE_PATH),
    'utf8',
  );
  const iosProject = readFileSync(
    resolve(workspaceRoot, IOS_PROJECT_PATH),
    'utf8',
  );
  const androidVersion = androidBuildGradle.match(
    /^\s*versionName\s+"([^"]+)"\s*$/m,
  )?.[1];
  const iosVersions = [
    ...iosProject.matchAll(/MARKETING_VERSION = ([^;]+);/g),
  ].map((match) => match[1]);
  const versions = new Set([androidVersion, ...iosVersions]);

  if (!androidVersion || iosVersions.length === 0 || versions.size !== 1) {
    throw new Error('Android and iOS versions must exist and match.');
  }

  return androidVersion;
}

/**
 * Writes the marketing version into both native projects.
 *
 * Every `MARKETING_VERSION` occurrence is rewritten, not just the first: the
 * Xcode project declares one per build configuration, and a partial write would
 * ship a Debug and a Release build claiming different versions.
 */
export function writeNativeVersion(version, workspaceRoot = process.cwd()) {
  const androidBuildGradlePath = resolve(
    workspaceRoot,
    ANDROID_BUILD_GRADLE_PATH,
  );
  const iosProjectPath = resolve(workspaceRoot, IOS_PROJECT_PATH);

  const androidBuildGradle = readFileSync(androidBuildGradlePath, 'utf8');
  const iosProject = readFileSync(iosProjectPath, 'utf8');

  if (!/^\s*versionName\s+"[^"]+"\s*$/m.test(androidBuildGradle)) {
    throw new Error('Could not find the Android versionName.');
  }

  if (!/MARKETING_VERSION = [^;]+;/.test(iosProject)) {
    throw new Error('Could not find an iOS MARKETING_VERSION.');
  }

  writeFileSync(
    androidBuildGradlePath,
    androidBuildGradle.replace(
      /^(\s*versionName\s+)"[^"]+"(\s*)$/m,
      `$1"${version}"$2`,
    ),
  );
  writeFileSync(
    iosProjectPath,
    iosProject.replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${version};`,
    ),
  );

  return version;
}

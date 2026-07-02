import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { readBuildNumber } = require('../apps/bite-tribe/read-build-number.js');

const releaseFiles = [
  'CHANGELOG.md',
  'apps/bite-tribe-android/android/app/build.gradle',
  'apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj',
];

ensureCleanWorkingTree();

const buildNumber = readBuildNumber(process.cwd());
const version = readNativeVersion();
const tagName = `build-${version}-${buildNumber}`;

ensureTagDoesNotExist(tagName);

run('npm', ['run', 'generate-changelog']);
run('npm', ['run', 'increment-build-number']);

run('git', ['add', ...releaseFiles]);

if (git(['diff', '--cached', '--quiet'], { allowFailure: true }).status === 0) {
  throw new Error('No release changes were staged.');
}

run('git', [
  'commit',
  '-m',
  `chore: prepare build ${version}-${buildNumber} release`,
]);
run('git', ['tag', '-a', tagName, '-m', `Build ${version} (${buildNumber})`]);
run('git', ['push', 'origin', 'HEAD']);
run('git', ['push', 'origin', tagName]);

console.log(`Release changes committed, tagged, and pushed as ${tagName}.`);

function ensureCleanWorkingTree() {
  const status = git(['status', '--porcelain']).stdout;

  if (status) {
    throw new Error(
      [
        'Working tree must be clean before preparing a release commit.',
        'Commit, stash, or discard existing changes first.',
      ].join('\n'),
    );
  }
}

function ensureTagDoesNotExist(tagName) {
  if (
    git(['rev-parse', '--quiet', '--verify', `refs/tags/${tagName}`], {
      allowFailure: true,
    }).status === 0
  ) {
    throw new Error(`Tag ${tagName} already exists locally.`);
  }

  const remoteTag = git(
    ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tagName}`],
    { allowFailure: true },
  );

  if (remoteTag.status === 0) {
    throw new Error(`Tag ${tagName} already exists on origin.`);
  }

  if (remoteTag.status !== 2) {
    throw new Error(`Could not confirm whether ${tagName} exists on origin.`);
  }
}

function readNativeVersion() {
  const androidBuildGradle = readFileSync(
    resolve('apps/bite-tribe-android/android/app/build.gradle'),
    'utf8',
  );
  const iosProject = readFileSync(
    resolve('apps/bite-tribe-ios/ios/App/App.xcodeproj/project.pbxproj'),
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

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function git(args, options = {}) {
  try {
    return {
      status: 0,
      stdout: execFileSync('git', args, { encoding: 'utf8' }).trim(),
    };
  } catch (error) {
    if (options.allowFailure) {
      return {
        status: error.status ?? 1,
        stdout: error.stdout?.toString().trim() ?? '',
      };
    }

    throw error;
  }
}

import { rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildNotes } from './changelog-sections.mjs';
import {
  ANDROID_BUILD_GRADLE_PATH,
  IOS_PROJECT_PATH,
  readNativeVersion,
  readPackageVersion,
} from './native-version.mjs';

const require = createRequire(import.meta.url);
const { readBuildNumber } = require('../apps/bite-tribe/read-build-number.js');

const releaseFiles = [
  'CHANGELOG.md',
  ANDROID_BUILD_GRADLE_PATH,
  IOS_PROJECT_PATH,
];

ensureCleanWorkingTree();

const buildNumber = readBuildNumber(process.cwd());
// `package.json` is the single source of truth for the marketing version
// (issue #1303). The native projects are written from it below, so reading them
// here would only re-read whatever the previous release happened to leave.
const version = readPackageVersion();
const tagName = `build-${version}-${buildNumber}`;

ensureTagDoesNotExist(tagName);

run('npm', ['run', 'generate-changelog']);
run('npm', ['run', 'sync-native-version']);
run('npm', ['run', 'increment-build-number']);

ensureNativeVersionMatches(version);

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

publishGitHubRelease(tagName, buildNumber);

function publishGitHubRelease(tagName, buildNumber) {
  const notes = buildNotes(buildNumber, { includeChores: true });
  const notesFile = join(tmpdir(), `bitetribe-release-${buildNumber}.md`);
  const draft = process.env.BITETRIBE_RELEASE_DRAFT === '1';

  writeFileSync(notesFile, `${notes}\n`, 'utf8');

  const args = [
    'release',
    'create',
    tagName,
    '--title',
    `Build ${buildNumber}`,
    '--notes-file',
    notesFile,
    ...(draft ? ['--draft'] : []),
  ];

  try {
    run('gh', args);
  } catch {
    // The commit, tag, and push already succeeded, so this is recoverable and
    // must not look like the whole release failed. The notes file is left in
    // place so the retry below works as printed.
    console.error(
      [
        '',
        `The release commit and tag ${tagName} were pushed successfully.`,
        'Only the GitHub release could not be created. Retry with:',
        '',
        `  gh release create ${tagName} --title "Build ${buildNumber}" --notes-file ${notesFile}`,
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  rmSync(notesFile, { force: true });
  console.log(
    `GitHub release "Build ${buildNumber}"${draft ? ' (draft)' : ''} published.`,
  );
}

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

/**
 * The equality check that used to gate the release now closes it.
 *
 * `readNativeVersion` still refuses a workspace whose Android and iOS projects
 * disagree, so this asserts the third source as well: all three must name the
 * same marketing version once the sync has run.
 */
function ensureNativeVersionMatches(version) {
  const nativeVersion = readNativeVersion();

  if (nativeVersion !== version) {
    throw new Error(
      [
        `package.json declares version ${version}, but the native projects`,
        `declare ${nativeVersion} after the sync.`,
      ].join(' '),
    );
  }
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

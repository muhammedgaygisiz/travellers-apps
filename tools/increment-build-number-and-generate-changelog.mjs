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

// Captured before anything is written. This is the tree the release artifacts
// are built from, and the tag has to point here rather than at the bump commit
// created below - see issue #1441. Tagging the bump commit made the tag name a
// build it did not contain: `build-1.0.1-96` pointed at a tree carrying 97, so
// a tag-triggered CI run produced 97 artifacts under a tag named 96.
const releaseCommit = git(['rev-parse', 'HEAD']).stdout;

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
// The tag is still created after the commit, so a failure above leaves no tag
// behind, but it names the commit captured before the release touched anything.
run('git', [
  'tag',
  '-a',
  tagName,
  releaseCommit,
  '-m',
  `Build ${version} (${buildNumber})`,
]);

ensureTagCarriesTheReleasedBuild(tagName, buildNumber);

run('git', ['push', 'origin', 'HEAD']);
run('git', ['push', 'origin', tagName]);

console.log(
  `Release changes committed and pushed. ${tagName} points at ${releaseCommit.slice(0, 7)}, which carries build ${buildNumber}.`,
);

publishGitHubRelease(tagName, buildNumber);
openReleasePullRequest(version, buildNumber);

/**
 * Opens the release pull request back to `develop`.
 *
 * `--fill` takes the title from the release commit, which is exactly what
 * [[Release Workflow]] asks for by hand: accept the generated
 * `chore: prepare build <version>-<x> release`.
 *
 * Like the GitHub release above, a failure here is reported and does not undo
 * the commit, tag and push that already succeeded. A pull request is the
 * cheapest thing in this script to redo, so it is last.
 */
function openReleasePullRequest(version, buildNumber) {
  try {
    run('gh', ['pr', 'create', '--base', 'develop', '--fill']);
  } catch {
    console.error(
      [
        '',
        'The release is pushed and the GitHub release is published.',
        'Only the pull request could not be opened. Retry with:',
        '',
        '  gh pr create --base develop --fill',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(
    `Release pull request opened for build ${version}-${buildNumber}.`,
  );
}

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

/**
 * Asserts the tag names a tree that declares the build it is named after.
 *
 * This is the invariant issue #1441 exists to establish, and it is cheap enough
 * to check every release rather than trust. `readBuildNumber` takes its own
 * file reader, so the same parsing that reads the working tree reads the tagged
 * one, and a future change to either native file cannot make the two disagree.
 */
function ensureTagCarriesTheReleasedBuild(tagName, buildNumber) {
  const taggedBuildNumber = readBuildNumber(
    '',
    (path) => git(['show', `${tagName}:${path}`]).stdout,
  );

  if (taggedBuildNumber !== buildNumber) {
    run('git', ['tag', '-d', tagName]);

    throw new Error(
      [
        `${tagName} points at a tree declaring build ${taggedBuildNumber},`,
        `not ${buildNumber}. The tag has been deleted; nothing was pushed.`,
      ].join(' '),
    );
  }
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

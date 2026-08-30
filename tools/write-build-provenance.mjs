import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/**
 * Records what a native build was made from.
 *
 * Neither store exposes the source commit, and reconstructing it afterwards
 * has needed a local reflog on one workstation
 * (see ssot/pages/Current State - Release Candidate Test Charter.md). This
 * writes it next to the artifacts instead, so the answer survives the machine.
 *
 * It also names the artifacts. `bite-tribe-1.0.1-96-ac217b9.aab` says which
 * build and which commit without opening anything.
 */
const require = createRequire(import.meta.url);
const { readBuildNumber } = require('../apps/bite-tribe/read-build-number');

const OUTPUT_PATH = resolve(process.argv[2] ?? 'dist/build-provenance.json');
const TAG_PATTERN = /^build-(.+)-(\d+)$/;

const workspaceRoot = process.cwd();
const { version } = require(resolve(workspaceRoot, 'package.json'));
const buildNumber = readBuildNumber(workspaceRoot);
const commit = process.env.GITHUB_SHA ?? git('rev-parse', 'HEAD');
const shortCommit = commit.slice(0, 7);
const ref = process.env.GITHUB_REF ?? git('rev-parse', '--abbrev-ref', 'HEAD');
const refName = process.env.GITHUB_REF_NAME ?? ref;

const provenance = {
  app: 'bite-tribe',
  version,
  buildNumber,
  artifactBaseName: `bite-tribe-${version}-${buildNumber}-${shortCommit}`,
  commit,
  ref,
  refName,
  builtAt: new Date().toISOString(),
  workflowRunUrl: workflowRunUrl(),
  tag: describeTag(refName),
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(provenance, null, 2)}\n`);

console.log(JSON.stringify(provenance, null, 2));

writeGithubOutput({
  version,
  'build-number': buildNumber,
  'artifact-base-name': provenance.artifactBaseName,
  commit,
  'short-commit': shortCommit,
});

if (provenance.tag && !provenance.tag.matchesTree) {
  warn(
    `Tag ${refName} names build ${provenance.tag.version} ` +
      `(${provenance.tag.buildNumber}), but this tree is ${version} ` +
      `(${buildNumber}). The artifacts are named after the tree, which is ` +
      'what was actually built. See the release-ordering note in ' +
      'ssot/pages/Implementation - Release And Build Workflow.md.',
  );
}

/**
 * Reads the version and build number a `build-<version>-<number>` tag claims.
 *
 * The tag is compared with the tree rather than trusted: the release helper
 * tags the bump commit, so a tag pushed by the current release names build `x`
 * on a tree that already carries `x+1`.
 */
function describeTag(name) {
  const match = TAG_PATTERN.exec(name);

  if (!match) {
    return null;
  }

  const [, tagVersion, tagBuildNumber] = match;

  return {
    name,
    version: tagVersion,
    buildNumber: tagBuildNumber,
    matchesTree: tagVersion === version && tagBuildNumber === buildNumber,
  };
}

function workflowRunUrl() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;

  if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) {
    return null;
  }

  return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

function writeGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
  );
}

function warn(message) {
  console.warn(
    process.env.GITHUB_ACTIONS
      ? `::warning::${message}`
      : `Warning: ${message}`,
  );
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

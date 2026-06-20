import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { readBuildNumber } = require('../apps/bite-tribe/read-build-number.js');

const changelogPath = resolve('CHANGELOG.md');
const buildNumber = readBuildNumber(process.cwd());
const buildTag = `build-${buildNumber}`;
const today = new Date().toISOString().slice(0, 10);
const currentRev = git(['rev-parse', '--short=8', 'HEAD']);

const typeHeadings = new Map([
  ['feat', 'Features'],
  ['fix', 'Bug Fixes'],
  ['perf', 'Performance Improvements'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['ci', 'Continuous Integration'],
  ['build', 'Build System'],
  ['test', 'Tests'],
  ['style', 'Styles'],
  ['chore', 'Chores'],
  ['revert', 'Reverts'],
]);

const changelog = existsSync(changelogPath)
  ? readFileSync(changelogPath, 'utf8')
  : '';
const existingBuildSection = getBuildSection(changelog, buildTag);
const existingStartRev = existingBuildSection?.match(
  /<!-- changelog-start-rev: ([^ ]+) -->/,
)?.[1];
const startRev =
  existingStartRev ??
  findLatestPreviousBuildRev(changelog, Number(buildNumber));
const commits = getCommits(startRev).map(parseCommit).filter(Boolean);
const section = renderSection(buildTag, today, startRev, currentRev, commits);
const nextChangelog = upsertBuildSection(changelog, buildTag, section);

writeFileSync(changelogPath, nextChangelog);

console.log(
  `Changelog ${existingBuildSection ? 'updated' : 'generated'} for ${buildTag}.`,
);

function getBuildSection(content, tag) {
  const sectionPattern = new RegExp(
    `^## ${escapeRegExp(tag)} \\([^\\n]+\\)\\n[\\s\\S]*?(?=^## build-\\d+ \\(|(?![\\s\\S]))`,
    'm',
  );

  return content.match(sectionPattern)?.[0];
}

function findLatestPreviousBuildRev(content, currentBuildNumber) {
  const gitBuilds = new Set(getGitBuildTags());
  const changelogBuilds = getChangelogBuilds(content);
  const candidates = [
    ...changelogBuilds.map(({ build, endRev }) => ({
      build,
      rev: gitBuilds.has(build) ? `build-${build}` : endRev,
    })),
    ...[...gitBuilds].map((build) => ({ build, rev: `build-${build}` })),
  ]
    .filter(({ build, rev }) => build < currentBuildNumber && rev)
    .sort((left, right) => right.build - left.build);

  return candidates[0]?.rev;
}

function getChangelogBuilds(content) {
  return [
    ...content.matchAll(
      /^## build-(\d+) \([^\n]+\)\n([\s\S]*?)(?=^## build-\d+ \(|(?![\s\S]))/gm,
    ),
  ].map((match) => ({
    build: Number(match[1]),
    endRev: match[2].match(/<!-- changelog-end-rev: ([^ ]+) -->/)?.[1],
  }));
}

function getGitBuildTags() {
  return git(['tag', '--merged', 'HEAD', '--list', 'build-*'])
    .split('\n')
    .map((tag) => tag.trim().match(/^build-(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
}

function getCommits(startRev) {
  const range = startRev ? `${startRev}..HEAD` : 'HEAD';
  const log = git(['log', '--format=%H%x00%s%x00%b%x1e', range]);

  return log
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body = ''] = entry.split('\x00');

      return { hash, subject, body };
    });
}

function parseCommit({ hash, subject, body }) {
  const match = subject.match(
    /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<message>.+)$/,
  );

  if (!match?.groups || !typeHeadings.has(match.groups.type)) {
    return undefined;
  }

  return {
    breaking:
      Boolean(match.groups.breaking) || /^BREAKING[ -]CHANGE:/m.test(body),
    hash: hash.slice(0, 8),
    message: match.groups.message,
    scope: match.groups.scope,
    type: match.groups.type,
  };
}

function renderSection(tag, date, startRev, endRev, parsedCommits) {
  const lines = [`## ${tag} (${date})`];

  if (startRev) {
    lines.push(`<!-- changelog-start-rev: ${startRev} -->`);
  }

  lines.push(`<!-- changelog-end-rev: ${endRev} -->`);

  if (parsedCommits.length === 0) {
    lines.push('', '- No conventional commits found.');

    return `${lines.join('\n')}\n\n`;
  }

  const commitsByType = Map.groupBy(parsedCommits, (commit) =>
    commit.breaking ? 'breaking' : commit.type,
  );

  if (commitsByType.has('breaking')) {
    lines.push('', '### Breaking Changes');
    lines.push(...commitsByType.get('breaking').map(renderCommit));
  }

  for (const [type, heading] of typeHeadings) {
    const commitsForType = commitsByType.get(type);

    if (!commitsForType?.length) {
      continue;
    }

    lines.push('', `### ${heading}`);
    lines.push(...commitsForType.map(renderCommit));
  }

  return `${lines.join('\n')}\n\n`;
}

function renderCommit(commit) {
  const scope = commit.scope ? `**${commit.scope}**: ` : '';

  return `- ${scope}${commit.message} (${commit.hash})`;
}

function upsertBuildSection(content, tag, section) {
  const normalizedContent = content.trimEnd();

  if (!normalizedContent) {
    return `# Changelog\n\n${section}`;
  }

  const sectionPattern = new RegExp(
    `^## ${escapeRegExp(tag)} \\([^\\n]+\\)\\n[\\s\\S]*?(?=^## build-\\d+ \\(|(?![\\s\\S]))`,
    'm',
  );

  if (sectionPattern.test(normalizedContent)) {
    return `${normalizedContent.replace(sectionPattern, section.trimEnd())}\n`;
  }

  const changelogTitle = normalizedContent.match(/^# .+\n?/);

  if (changelogTitle) {
    const rest = normalizedContent.slice(changelogTitle[0].length).trimStart();

    return `${changelogTitle[0].trimEnd()}\n\n${section}${rest ? `${rest}\n` : ''}`;
  }

  return `# Changelog\n\n${section}${normalizedContent}\n`;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

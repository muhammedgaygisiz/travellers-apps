import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const outputPath = resolve('ssot/pages/Changelog.md');
const releasesPath = resolve('ssot/pages/releases');
const tags = getTags();

mkdirSync(resolve('ssot/pages'), { recursive: true });
mkdirSync(releasesPath, { recursive: true });
clearReleasePages();
writeFileSync(outputPath, renderIndex(tags));

for (const release of buildReleases(tags)) {
  writeFileSync(
    join(releasesPath, `${release.tag.name}.md`),
    renderRelease(release),
  );
}

console.log(
  `Full changelog generated at ${outputPath} and ${releasesPath}.`,
);

function getTags() {
  return git(['tag', '--sort=creatordate'])
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((name) => {
      const commit = git(['rev-list', '-n', '1', name]);
      const date = git(['log', '-1', '--format=%cs', commit]);

      return { commit, date, name };
    });
}

function clearReleasePages() {
  for (const entry of readdirSync(releasesPath, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      rmSync(join(releasesPath, entry.name));
    }
  }
}

function renderIndex(allTags) {
  const lines = [];

  if (allTags.length === 0) {
    lines.push('- No git tags found.');

    return `${lines.join('\n')}\n`;
  }

  lines.push(
    ...allTags.map((tag) => `- [${tag.name}]([[releases/${tag.name}]]) (${tag.date})`),
  );

  return `${lines.join('\n')}\n`;
}

function buildReleases(allTags) {
  const releases = [];
  const previousTagCommits = [];

  for (const tag of allTags) {
    const commits = getCommitsForTag(tag.commit, previousTagCommits);

    releases.push({ commits, tag });
    previousTagCommits.push(tag.commit);
  }

  return releases;
}

function renderRelease({ commits, tag }) {
  const lines = [
    `- ${tag.name}`,
    `  - date:: ${tag.date}`,
    `  - git-tag:: ${tag.name}`,
    `  - git-commit:: ${tag.commit.slice(0, 8)}`,
    '  - [[Changelog]]',
    '  - Commits',
  ];

  if (commits.length === 0) {
    lines.push('    - No new commits since the previous tag.');
  } else {
    lines.push(...commits.map(renderCommit));
  }

  return `${lines.join('\n')}\n`;
}

function getCommitsForTag(tagCommit, previousTagCommits) {
  const args = [
    'log',
    '--reverse',
    '--format=%h%x00%s',
    tagCommit,
    ...previousTagCommits.map((commit) => `^${commit}`),
  ];

  return git(args)
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject] = entry.split('\x00');

      return { hash, subject };
    });
}

function renderCommit(commit) {
  return `    - ${commit.subject.replace(/\s+/g, ' ')} (${commit.hash})`;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

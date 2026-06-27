import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = 'muhammedgaygisiz/travellers-apps';
const outputPath = resolve('ssot/pages/Epics.md');
const backupPath = resolve('ssot/logseq/bak');
const issues = getIssues();

writeFileSync(outputPath, renderEpicsPage(issues));
rmSync(backupPath, { force: true, recursive: true });

console.log(`Rendered ${issues.length} epics to ${outputPath}.`);

function getIssues() {
  const inputPath = getOptionValue('--input');

  if (inputPath) {
    return normalizeIssues(JSON.parse(readFileSync(inputPath, 'utf8')));
  }

  if (!process.stdin.isTTY) {
    const input = readFileSync(0, 'utf8').trim();

    if (input) {
      return normalizeIssues(JSON.parse(input));
    }
  }

  return normalizeIssues(JSON.parse(fetchIssuesWithGh()));
}

function fetchIssuesWithGh() {
  return execFileSync(
    'gh',
    [
      'issue',
      'list',
      '--repo',
      repo,
      '--state',
      'all',
      '--search',
      'epic: in:title',
      '--limit',
      '200',
      '--json',
      'number,title,url',
    ],
    { encoding: 'utf8' },
  );
}

function normalizeIssues(payload) {
  const rawIssues = Array.isArray(payload) ? payload : payload.issues;

  if (!Array.isArray(rawIssues)) {
    throw new Error('Expected an issue array or an object with an issues array.');
  }

  return rawIssues
    .map((issue) => ({
      number: issue.number ?? issue.issue_number,
      title: issue.title,
      url: issue.url ?? issue.display_url ?? issue.html_url,
    }))
    .filter((issue) => issue.number && issue.title && issue.url)
    .filter((issue) => issue.title.toLowerCase().startsWith('epic:'))
    .sort((left, right) => left.number - right.number);
}

function renderEpicsPage(epics) {
  if (epics.length === 0) {
    return '- No GitHub issues with titles starting with `epic:` found.\n';
  }

  return `${epics.map(renderEpic).join('\n')}\n`;
}

function renderEpic(issue) {
  return `- [${escapeLinkText(issue.title)}](${issue.url}) (Issue \\#${issue.number})`;
}

function escapeLinkText(value) {
  return value.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function getOptionValue(optionName) {
  const index = process.argv.indexOf(optionName);

  return index === -1 ? undefined : process.argv[index + 1];
}

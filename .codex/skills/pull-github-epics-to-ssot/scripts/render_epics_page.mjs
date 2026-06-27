import { execFileSync } from 'node:child_process';
import {
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const repo = 'muhammedgaygisiz/travellers-apps';
const pagesPath = resolve('ssot/pages');
const epicsIndexPath = join(pagesPath, 'Epics.md');
const backupPath = resolve('ssot/logseq/bak');
const subIssuesQuery = `
  query($owner:String!, $name:String!, $number:Int!, $cursor:String) {
    repository(owner:$owner, name:$name) {
      issue(number:$number) {
        subIssues(first:100, after:$cursor) {
          nodes {
            number
            title
            url
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;
const issues = getIssues();
const epics = getEpics(issues);

clearGeneratedEpicPages();
writeFileSync(epicsIndexPath, renderEpicsIndex(epics));

for (const epic of epics) {
  writeFileSync(
    join(pagesPath, getEpicFileName(epic)),
    renderEpicPage(epic, getRelatedIssues(epic, issues)),
  );
}

rmSync(backupPath, { force: true, recursive: true });

console.log(`Rendered ${epics.length} epics to ${epicsIndexPath}.`);

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
  const issues = JSON.parse(
    execFileSync(
      'gh',
      [
        'issue',
        'list',
        '--repo',
        repo,
        '--state',
        'all',
        '--limit',
        '1000',
        '--json',
        'number,title,url,body,labels,milestone',
      ],
      { encoding: 'utf8' },
    ),
  );

  for (const epic of issues.filter((issue) =>
    issue.title.toLowerCase().startsWith('epic:'),
  )) {
    epic.subIssues = fetchSubIssuesWithGh(epic.number);
  }

  return JSON.stringify(issues);
}

function fetchSubIssuesWithGh(epicNumber) {
  const subIssues = [];
  let cursor;

  do {
    const args = [
      'api',
      'graphql',
      '-f',
      'owner=muhammedgaygisiz',
      '-f',
      'name=travellers-apps',
      '-F',
      `number=${epicNumber}`,
      '-f',
      `query=${subIssuesQuery}`,
    ];

    if (cursor) {
      args.push('-f', `cursor=${cursor}`);
    }

    const response = JSON.parse(
      execFileSync('gh', args, { encoding: 'utf8' }),
    );
    const connection = response.data.repository.issue.subIssues;

    subIssues.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : undefined;
  } while (cursor);

  return subIssues;
}

function normalizeIssues(payload) {
  const rawIssues = Array.isArray(payload) ? payload : payload.issues;

  if (!Array.isArray(rawIssues)) {
    throw new Error('Expected an issue array or an object with an issues array.');
  }

  return rawIssues
    .map((issue) => ({
      body: issue.body ?? '',
      labels: (issue.labels ?? []).map((label) =>
        typeof label === 'string' ? label : label.name,
      ),
      milestone: getMilestoneTitle(issue.milestone),
      number: issue.number ?? issue.issue_number,
      subIssues: normalizeSubIssues(issue.subIssues ?? issue.sub_issues ?? []),
      title: issue.title,
      url: issue.url ?? issue.display_url ?? issue.html_url,
    }))
    .filter((issue) => issue.number && issue.title && issue.url)
    .sort((left, right) => left.number - right.number);
}

function normalizeSubIssues(subIssues) {
  return subIssues
    .map((issue) => ({
      number: issue.number ?? issue.issue_number,
      title: issue.title,
      url: issue.url ?? issue.display_url ?? issue.html_url,
    }))
    .filter((issue) => issue.number && issue.title && issue.url);
}

function getMilestoneTitle(milestone) {
  if (!milestone) {
    return undefined;
  }

  return typeof milestone === 'string' ? milestone : milestone.title;
}

function getEpics(allIssues) {
  return allIssues.filter((issue) =>
    issue.title.toLowerCase().startsWith('epic:'),
  );
}

function clearGeneratedEpicPages() {
  for (const entry of readdirSync(pagesPath, { withFileTypes: true })) {
    if (entry.isFile() && /^epic-\d+\.md$/.test(entry.name)) {
      rmSync(join(pagesPath, entry.name));
    }
  }
}

function renderEpicsIndex(allEpics) {
  if (allEpics.length === 0) {
    return '- No GitHub issues with titles starting with `epic:` found.\n';
  }

  return `${allEpics.map(renderEpicIndexItem).join('\n')}\n`;
}

function renderEpicIndexItem(epic) {
  return `- [${renderLinkText(epic.title)}]([[${getEpicPageName(epic)}]]) (Issue \\#${epic.number})`;
}

function renderEpicPage(epic, relatedIssues) {
  return [
    `- [${renderLinkText(epic.title)}](${epic.url}) (Issue \\#${epic.number})`,
    '- Description',
    ...renderDescription(epic.body),
    '- Related issues',
    ...renderRelatedIssues(relatedIssues),
  ].join('\n') + '\n';
}

function renderDescription(body) {
  const normalizedBody = body.trim();

  if (!normalizedBody) {
    return ['  - No description provided.'];
  }

  return normalizedBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `  - ${renderText(stripMarkdownListMarker(line))}`);
}

function stripMarkdownListMarker(line) {
  return line.replace(/^[-*]\s+/, '');
}

function renderRelatedIssues(relatedIssues) {
  if (relatedIssues.length === 0) {
    return ['  - No linked issues found.'];
  }

  return relatedIssues.map(
    (issue) =>
      `  - [${renderLinkText(issue.title)}](${issue.url}) (Issue \\#${issue.number})`,
  );
}

function getRelatedIssues(epic, allIssues) {
  if (epic.subIssues.length > 0) {
    return epic.subIssues;
  }

  const epicNumberReference = `#${epic.number}`;
  const epicPageReference = `epic-${epic.number}`;
  const epicTitle = normalizeText(epic.title.replace(/^epic:\s*/i, ''));

  return allIssues
    .filter((issue) => issue.number !== epic.number)
    .filter((issue) => !issue.title.toLowerCase().startsWith('epic:'))
    .filter((issue) => {
      const searchableText = `${issue.title}\n${issue.body}`.toLowerCase();
      const labels = issue.labels.map((label) => normalizeText(label));
      const milestone = normalizeText(issue.milestone ?? '');

      return (
        searchableText.includes(epicNumberReference.toLowerCase()) ||
        searchableText.includes(epicPageReference) ||
        labels.includes(`epic:${epic.number}`) ||
        labels.includes(epicPageReference) ||
        milestone.includes(String(epic.number)) ||
        (epicTitle && milestone === epicTitle)
      );
    });
}

function getEpicFileName(epic) {
  return `${getEpicPageName(epic)}.md`;
}

function getEpicPageName(epic) {
  return `epic-${epic.number}`;
}

function renderText(value) {
  return value.replace(/\s+/g, ' ').replaceAll('#', '\\#');
}

function renderLinkText(value) {
  return escapeLinkText(renderText(value));
}

function normalizeText(value) {
  return value.toLowerCase().trim();
}

function escapeLinkText(value) {
  return value.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function getOptionValue(optionName) {
  const index = process.argv.indexOf(optionName);

  return index === -1 ? undefined : process.argv[index + 1];
}

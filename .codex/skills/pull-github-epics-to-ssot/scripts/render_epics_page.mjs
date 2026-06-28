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
const ssotPath = join(pagesPath, 'SSOT.md');
const contentsPath = join(pagesPath, 'contents.md');
const backupPath = resolve('ssot/logseq/bak');
const projectNumber = '4';
const projectOwner = 'muhammedgaygisiz';
const priorityP0Names = new Set(['p0', 'priority p0', 'priority:p0', 'priority-p0']);
let priorityP0IssueNumbers;
const subIssuesQuery = `
  query($owner:String!, $name:String!, $number:Int!, $cursor:String) {
    repository(owner:$owner, name:$name) {
      issue(number:$number) {
        subIssues(first:100, after:$cursor) {
          nodes {
            body
            labels(first:20) {
              nodes {
                name
              }
            }
            number
            state
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
const subIssues = getUniqueSubIssues(epics);

clearGeneratedEpicPages();
rmSync(epicsIndexPath, { force: true });
writeFileSync(ssotPath, replaceRootSection(readFileSync(ssotPath, 'utf8'), 'Epics', renderEpicsSection(epics, '\t')));
writeFileSync(contentsPath, replaceRootSection(readFileSync(contentsPath, 'utf8'), 'Epics', renderEpicsSection(epics, '  ')));

for (const epic of epics) {
  writeFileSync(
    join(pagesPath, getEpicFileName(epic)),
    renderEpicPage(epic, getRelatedIssues(epic, issues)),
  );
}

for (const issue of subIssues) {
  writeFileSync(join(pagesPath, getIssueFileName(issue)), renderIssuePage(issue));
}

rmSync(backupPath, { force: true, recursive: true });

console.log(
  `Rendered ${epics.length} open Priority P0 epics and ${subIssues.length} open Priority P0 sub-issues to ${pagesPath}.`,
);

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
  let issues;
  const p0IssueNumbers = getPriorityP0IssueNumbers();

  try {
    issues = JSON.parse(execFileSync(
      'gh',
      [
        'issue',
        'list',
        '--repo',
        repo,
        '--state',
        'open',
        '--limit',
        '1000',
        '--json',
        'number,title,url,body,labels,milestone,state,projectItems',
      ],
      { encoding: 'utf8' },
    ));
    issues = issues.map((issue) => ({
      ...issue,
      priorityP0: p0IssueNumbers.has(issue.number),
    }));
  } catch (error) {
    handleProjectScopeError(error);
    throw error;
  }

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

  return subIssues.map((issue) => enrichIssueWithGhProjectData(issue.number));
}

function enrichIssueWithGhProjectData(issueNumber) {
  try {
    const issue = JSON.parse(execFileSync(
      'gh',
      [
        'issue',
        'view',
        String(issueNumber),
        '--repo',
        repo,
        '--json',
        'number,title,url,body,labels,state,projectItems',
      ],
      { encoding: 'utf8' },
    ));

    return {
      ...issue,
      priorityP0: getPriorityP0IssueNumbers().has(issue.number),
    };
  } catch (error) {
    handleProjectScopeError(error);
    throw error;
  }
}

function getPriorityP0IssueNumbers() {
  if (priorityP0IssueNumbers) {
    return priorityP0IssueNumbers;
  }

  try {
    const projectItems = JSON.parse(execFileSync(
      'gh',
      [
        'project',
        'item-list',
        projectNumber,
        '--owner',
        projectOwner,
        '--format',
        'json',
        '--limit',
        '1000',
      ],
      { encoding: 'utf8' },
    )).items;

    priorityP0IssueNumbers = new Set(
      projectItems
        .filter((item) => item.priority === 'P0')
        .map((item) => item.content?.number)
        .filter(Boolean),
    );

    return priorityP0IssueNumbers;
  } catch (error) {
    handleProjectScopeError(error);
    throw error;
  }
}

function normalizeIssues(payload) {
  const rawIssues = Array.isArray(payload) ? payload : payload.issues;

  if (!Array.isArray(rawIssues)) {
    throw new Error('Expected an issue array or an object with an issues array.');
  }

  return rawIssues
    .map((issue) => ({
      body: issue.body ?? '',
      labels: normalizeLabels(issue.labels),
      milestone: getMilestoneTitle(issue.milestone),
      number: issue.number ?? issue.issue_number,
      priorityP0: issue.priorityP0 ?? issue.priority_p0,
      projectItems: issue.projectItems ?? issue.project_items ?? [],
      subIssues: normalizeSubIssues(issue.subIssues ?? issue.sub_issues ?? []),
      state: issue.state,
      title: issue.title,
      url: issue.url ?? issue.display_url ?? issue.html_url,
    }))
    .filter((issue) => issue.number && issue.title && issue.url)
    .filter((issue) => isOpenIssue(issue))
    .filter((issue) => hasPriorityP0(issue))
    .sort((left, right) => left.number - right.number);
}

function normalizeSubIssues(subIssues) {
  return subIssues
    .map((issue) => ({
      body: issue.body ?? '',
      labels: normalizeLabels(issue.labels),
      number: issue.number ?? issue.issue_number,
      priorityP0: issue.priorityP0 ?? issue.priority_p0,
      projectItems: issue.projectItems ?? issue.project_items ?? [],
      state: issue.state,
      title: issue.title,
      url: issue.url ?? issue.display_url ?? issue.html_url,
    }))
    .filter((issue) => issue.number && issue.title && issue.url)
    .filter((issue) => isOpenIssue(issue))
    .filter((issue) => hasPriorityP0(issue));
}

function isOpenIssue(issue) {
  if (!issue.state) {
    return true;
  }

  return issue.state.toLowerCase() === 'open';
}

function hasPriorityP0(issue) {
  if (issue.priorityP0) {
    return true;
  }

  const labels = issue.labels.map((label) => normalizeText(label));

  if (labels.some((label) => priorityP0Names.has(label))) {
    return true;
  }

  return projectItemsContainPriorityP0(issue.projectItems);
}

function projectItemsContainPriorityP0(projectItems) {
  const projectItemsText = JSON.stringify(projectItems ?? {}).toLowerCase();

  return projectItemsText.includes('priority') && /\bp0\b/.test(projectItemsText);
}

function normalizeLabels(labels) {
  return (labels ?? []).map((label) =>
    typeof label === 'string' ? label : label.name,
  ).filter(Boolean);
}

function handleProjectScopeError(error) {
  const message = `${error.stderr ?? ''}\n${error.stdout ?? ''}\n${error.message ?? ''}`;

  if (!message.includes('read:project')) {
    return;
  }

  throw new Error(
    'Cannot filter epics/issues by GitHub Project Priority P0 because gh lacks the read:project scope. Run `gh auth refresh -s read:project` and retry the epics refresh.',
  );
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
    if (entry.isFile() && /^(epic|issue)-\d+\.md$/.test(entry.name)) {
      rmSync(join(pagesPath, entry.name));
    }
  }
}

function renderEpicsSection(allEpics, indent) {
  if (allEpics.length === 0) {
    return `- Epics\n${indent}- No GitHub issues with titles starting with \`epic:\` found.\n`;
  }

  return `- Epics\n${allEpics.map((epic) => renderEpicSectionItem(epic, indent)).join('\n')}\n`;
}

function renderEpicSectionItem(epic, indent) {
  return `${indent}- [[${getEpicPageName(epic)}]]`;
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
      `  - [${renderLinkText(issue.title)}]([[${getIssuePageName(issue)}]]) (Issue \\#${issue.number})`,
  );
}

function renderIssuePage(issue) {
  return [
    `- [${renderLinkText(issue.title)}](${issue.url}) (Issue \\#${issue.number})`,
    '- Description',
    ...renderDescription(issue.body),
  ].join('\n') + '\n';
}

function getUniqueSubIssues(allEpics) {
  const issuesByNumber = new Map();

  for (const epic of allEpics) {
    for (const issue of epic.subIssues) {
      issuesByNumber.set(issue.number, issue);
    }
  }

  return [...issuesByNumber.values()].sort(
    (left, right) => left.number - right.number,
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

function getIssueFileName(issue) {
  return `${getIssuePageName(issue)}.md`;
}

function getIssuePageName(issue) {
  return `issue-${issue.number}`;
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

function replaceRootSection(content, sectionTitle, renderedSection) {
  const lines = content.trimEnd().split('\n');
  const start = lines.findIndex((line) => line.trim() === `- ${sectionTitle}` || line.trim() === `- [[${sectionTitle}]]`);

  if (start === -1) {
    return `${content.trimEnd()}\n${renderedSection}`;
  }

  let end = start + 1;

  while (end < lines.length && !lines[end].startsWith('- ')) {
    end += 1;
  }

  lines.splice(start, end - start, ...renderedSection.trimEnd().split('\n'));

  return `${lines.join('\n')}\n`;
}

function getOptionValue(optionName) {
  const index = process.argv.indexOf(optionName);

  return index === -1 ? undefined : process.argv[index + 1];
}

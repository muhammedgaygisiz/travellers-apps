import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Two ranges are cut out of a build's changelog section:
//
//   store   - Features up to, but not including, Chores. Summarized to at most
//             230 characters for TestFlight "What to Test" and the Play Console
//             release notes.
//   full    - every heading in the section. Used as the GitHub release body.
//
// See ssot/pages/Release Workflow.md.

const CHORES_HEADING = /^### Chores$/m;
const FIRST_HEADING = /^### /m;

export function readChangelog(workspaceRoot = process.cwd()) {
  return readFileSync(resolve(workspaceRoot, 'CHANGELOG.md'), 'utf8');
}

export function readBuildSection(changelog, buildNumber) {
  const pattern = new RegExp(
    `^## build-${buildNumber} \\([^\\n]+\\)\\n[\\s\\S]*?(?=^## build-\\d+ \\(|(?![\\s\\S]))`,
    'm',
  );

  return changelog.match(pattern)?.[0]?.trimEnd();
}

export function extractNotes(section, { includeChores = true } = {}) {
  const headingStart = section.search(FIRST_HEADING);

  if (headingStart === -1) {
    // A build with no conventional commits renders a bare bullet instead of
    // headings. Fall back to the body so the release is still described.
    return section
      .replace(/^## [^\n]*\n/, '')
      .replace(/^<!--[^\n]*-->\n/gm, '')
      .trim();
  }

  const body = section.slice(headingStart);

  if (includeChores) {
    return body.trim();
  }

  const choresStart = body.search(CHORES_HEADING);

  return (choresStart === -1 ? body : body.slice(0, choresStart)).trim();
}

export function buildNotes(buildNumber, options) {
  const section = readBuildSection(readChangelog(), buildNumber);

  if (!section) {
    throw new Error(`No changelog section found for build ${buildNumber}.`);
  }

  return extractNotes(section, options);
}

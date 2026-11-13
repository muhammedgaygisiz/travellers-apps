#!/usr/bin/env node
/**
 * Structural checks for the SSOT. Run: npm run check:ssot
 *
 * The SSOT is plain markdown that has to stay navigable from GitHub, so the rules
 * below are the ones a reader cannot see being broken: a link that resolves to
 * nothing, a leftover Logseq wikilink, an issue number that does not link, a quoted
 * code path that resolves to nothing, issue state copied out of GitHub, a
 * current-state page nobody has verified, a generated block edited by hand or not
 * regenerated, the use-case format rules in ssot/overview/use-case-format.md, and the
 * word budgets of what every agent reads before its task.
 *
 * Exits non-zero when any rule fails, listing every failure. Warnings are listed
 * too but never change the exit code.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { MAP, regenerate } from './generate-traceability-map.mjs';

const SSOT = resolve('ssot');
// `Claude outputs` is where the Claude desktop app drops files; it is git-ignored.
const SKIP = new Set(['assets', 'Claude outputs']);
const failures = [];
const fail = (file, rule, message) =>
  failures.push({ file: relative('.', file), rule, message });
const warnings = [];
const warn = (file, rule, message) =>
  warnings.push({ file: relative('.', file), rule, message });

// A current-state page last verified longer ago than this is reported, not failed:
// a blocking age check would fail unrelated pull requests the day a page turns stale.
const VERIFIED_MAX_AGE_DAYS = 30;
// What an agent reads before its task: AGENTS.md and the documents it names under
// `## Always Read`. Past this, growth is a decision taken in a pull request, not
// something that happens by accretion; a warning, so that the decision stays possible.
const ENTRY_BUDGET_WORDS = 3500;
// The traceability map is read by every feature and fix task. It is generated in part,
// so it grows with every use case; past this, look at what it carries before it grows on.
const MAP_BUDGET_WORDS = 3000;
// Words as `wc -w` counts them.
const words = (text) => text.split(/\s+/).filter(Boolean).length;
// Pages that describe the tree as it was, so their quoted paths may no longer resolve.
const HISTORICAL = ['records', 'releases', 'test-runs'];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) out.push(...walk(join(dir, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** spans of fenced blocks and inline code, so notation is never mistaken for markup */
function codeSpans(text) {
  const spans = [];
  for (const m of text.matchAll(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm)) {
    spans.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(/`[^`\n]*`/g)) {
    spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}
const inCode = (spans, i) => spans.some(([a, b]) => i >= a && i < b);
const stripFences = (text) => text.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '');

// ---- the working tree, as git sees it: tracked and untracked, ignored files left out ----
const git = (args, input) =>
  execFileSync('git', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'ignore'] });
const tree = new Set();
for (const path of git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0')) {
  if (!path) continue;
  const parts = path.split('/');
  for (let i = 1; i <= parts.length; i++) tree.add(parts.slice(0, i).join('/'));
}
const treeList = [...tree];
const escape = (s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&');
/**
 * Whether a quoted path names something in the tree. `...` stands for any subpath;
 * the notation the SSOT already uses for families of files - `*`, `**`, `<lang>` and
 * `{page,data-access}` - matches the way a reader would expect it to.
 */
function resolves(quoted) {
  const path = quoted.replace(/\/+$/, '');
  if (!/\.\.\.|[*<{]/.test(path)) return tree.has(path);
  const pattern = path
    .split(/(\/\.\.\.\/|\*\*|\*|<[^>/]+>|\{[^}/]+})/)
    .map((part) => {
      if (part === '/.../') return '/(?:[^/]+/)*';
      if (part === '**') return '.*';
      if (part === '*') return '[^/]*';
      if (part.startsWith('<')) return '[^/]+';
      if (part.startsWith('{')) return `(?:${part.slice(1, -1).split(',').map(escape).join('|')})`;
      return escape(part);
    })
    .join('');
  const re = new RegExp(`^${pattern}$`);
  return treeList.some((p) => re.test(p));
}
function ignored(paths) {
  if (!paths.length) return new Set();
  try {
    return new Set(git(['check-ignore', '--no-index', '--stdin'], paths.join('\n')).split('\n'));
  } catch (error) {
    // exit status 1 means none of the paths is ignored
    if (error.status === 1) return new Set();
    throw error;
  }
}
const unresolved = [];
const today = new Date(new Date().toISOString().slice(0, 10));

const files = walk(SSOT);
const exists = (p) => {
  try { statSync(p); return true; } catch { return false; }
};

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const spans = codeSpans(text);

  for (const m of text.matchAll(/]\((?!https?:|mailto:|#)([^)\s]+)\)/g)) {
    if (inCode(spans, m.index)) continue;
    const target = m[1].split('#')[0];
    if (target && !exists(resolve(dirname(file), target))) {
      fail(file, 'LINK', `points at nothing: ${m[1]}`);
    }
  }

  for (const m of text.matchAll(/\[\[/g)) {
    if (!inCode(spans, m.index)) fail(file, 'WIKILINK', 'Logseq wikilink outside code');
  }

  for (const m of text.matchAll(/\\#\d|(?<![\w\\[/#])#\d{3,5}(?!]\[)\b/g)) {
    if (inCode(spans, m.index)) continue;
    if (/^]\[#\d+]/.test(text.slice(m.index + m[0].length))) continue;
    fail(file, 'ISSUEREF', `issue reference does not link: ${m[0]}`);
  }

  const defined = new Set([...text.matchAll(/^\[#(\d+)]: /gm)].map((m) => m[1]));
  for (const m of text.matchAll(/]\[#(\d+)]|(?<!:)\[#(\d+)](?!:)/g)) {
    if (inCode(spans, m.index)) continue;
    const n = m[1] ?? m[2];
    if (!defined.has(n)) fail(file, 'REFDEF', `[#${n}] used with no definition in this file`);
  }

  if (/^\s*[a-z-]+:: /m.test(text)) fail(file, 'LOGSEQ', 'Logseq property (`key:: value`)');
  if (/^- \S/.test(text)) fail(file, 'LOGSEQ', 'file opens as an outline bullet, not a heading');
  for (const m of text.matchAll(/^[ \t]*- (#{1,6}) /gm)) {
    if (inCode(spans, m.index)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    fail(file, 'LOGSEQ', `line ${line}: heading written as an outline bullet (\`- ${m[1]}\`)`);
  }

  const page = relative(SSOT, file).split(sep);
  if (!HISTORICAL.includes(page[0])) {
    for (const m of stripFences(text).matchAll(/`((?:apps|libs|tools)\/[^`\n]*)`/g)) {
      if (!resolves(m[1])) unresolved.push({ file, path: m[1] });
    }
  }

  if (page[0] === 'current-state') {
    const lines = text.split('\n');
    const h1 = lines.findIndex((l) => /^# /.test(l));
    const next = lines.slice(h1 + 1).find((l) => l.trim()) ?? '';
    const m = /^\*\*Last verified:\*\* (\d{4}-\d{2}-\d{2})\s*$/.exec(next);
    if (h1 < 0 || !m) {
      fail(file, 'VERIFIED', 'no `**Last verified:** YYYY-MM-DD` line below the `#` heading');
    } else {
      const age = Math.floor((today - new Date(m[1])) / 86_400_000);
      if (Number.isNaN(age)) fail(file, 'VERIFIED', `not a date: ${m[1]}`);
      else if (age > VERIFIED_MAX_AGE_DAYS) {
        warn(file, 'VERIFIED', `last verified ${m[1]}, ${age} days ago - read it against the current state`);
      }
    }
  }
}

const ignoredPaths = ignored([...new Set(unresolved.map((u) => u.path))]);
for (const { file, path } of unresolved) {
  if (!ignoredPaths.has(path)) fail(file, 'PATH', `resolves to nothing: ${path}`);
}

// ---- use-case format (ssot/overview/use-case-format.md) ----
const SECTIONS = [
  ['Status', 'vvvv'], ['Goal', 'vvvv'], ['Actors', 'vvvv'], ['Lanes', '--vv'],
  ['Aggregate', '--vv'], ['Scope', '--vv'], ['Trigger', '--vv'], ['Preconditions', '--vv'],
  ['Guarantees', 'oovv'], ['Flow', 'oo--'], ['Actogram', 'oovv'], ['Rules And Invariants', 'oovv'],
  ['Exceptions And Failure Modes', '--ov'], ['Authorization', 'oovv'], ['MVP Classification', 'vvvv'],
  ['App Store Review Area', 'ovvv'], ['Supported Evidence', 'ov--'], ['Related GitHub Scope', 'ovvv'],
  ['Related Domains', 'vvvv'], ['Related Pages', 'oovv'],
];
const ORDER = new Map(SECTIONS.map(([n], i) => [n, i]));
const index = readFileSync(join(SSOT, 'README.md'), 'utf8');
const domainSection = index.split('## Domain\n')[1]?.split('\n## ')[0] ?? '';
const domains = new Set([...domainSection.matchAll(/\[([^\]]+)]\(domain\//g)].map((m) => m[1]));
const nextUp = new Set(
  [...(index.split('### Next to implement\n')[1]?.split('\n##')[0] ?? '')
    .matchAll(/\[([^\]]+)]\(use-cases\//g)].map((m) => m[1]),
);
const section = (text, name) => {
  const part = text.split(/^## /m).slice(1).find((p) => p.split('\n')[0].trim() === name);
  return part === undefined ? null : part.slice(part.indexOf('\n') + 1);
};

for (const file of readdirSync(join(SSOT, 'use-cases'))
  .filter((f) => f.startsWith('uc-') && f.endsWith('.md'))
  .map((f) => join(SSOT, 'use-cases', f))) {
  const text = readFileSync(file, 'utf8');
  const bare = text.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '');
  const heads = [...bare.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
  const title = /^# (.+)$/m.exec(text)?.[1] ?? '';

  let level = null;
  const status = section(bare, 'Status');
  if (status === null) fail(file, 'UF-1', 'no `## Status` section');
  else {
    const first = status.split('\n').find((l) => l.trim()) ?? '';
    const m = /^\*\*Level:\*\*\s*(L[0-3])\b/.exec(first.trim());
    if (!m) fail(file, 'UF-1', `Status does not open with \`**Level:** Ln\`: ${first.trim().slice(0, 40)}`);
    else level = m[1];
  }

  for (const [name, mask] of SECTIONS) {
    if (mask[0] === 'v' && !heads.includes(name)) fail(file, 'UF-4', `missing L0-required \`${name}\``);
    if (!level) continue;
    const at = mask[Number(level[1])];
    if (at === 'v' && !heads.includes(name)) fail(file, 'UF-4', `\`${name}\` required at ${level}, absent`);
    if (at === '-' && heads.includes(name)) fail(file, 'UF-4', `\`${name}\` not used at ${level}, present`);
  }
  const known = heads.filter((h) => ORDER.has(h)).map((h) => ORDER.get(h));
  if (known.some((v, i) => i && v < known[i - 1])) fail(file, 'UF-4', 'sections out of order');
  if (new Set(heads).size !== heads.length) fail(file, 'UF-4', 'duplicated section');
  if (heads.includes('Notation')) fail(file, 'UF-5', '`Notation` section present');
  if (heads.includes('Recorded Decisions')) fail(file, 'UF-6', '`Recorded Decisions` section present');

  const mvp = section(bare, 'MVP Classification');
  if (mvp !== null) {
    const tags = new Set([...mvp.matchAll(/\*\*\[(MVP|Secondary|Obsolete)]\*\*/g)].map((m) => m[1]));
    if (!tags.size) fail(file, 'UF-14', 'no classification tag');
    if (tags.has('Obsolete') && tags.size > 1) fail(file, 'UF-21', '`[Obsolete]` mixed with another tag');
  }

  const linksIn = (name) =>
    [...(section(bare, name) ?? '').matchAll(/\[([^\]]+)]\(([^)]+)\)/g)]
      .map((m) => ({ text: m[1], target: m[2] }));
  const rd = linksIn('Related Domains');
  const rp = linksIn('Related Pages');
  const both = rd.filter((d) => rp.some((p) => p.target === d.target)).map((d) => d.text);
  if (both.length) fail(file, 'UF-8', `in both Related Domains and Related Pages: ${both.join(', ')}`);
  if (!rd.length) fail(file, 'UF-4', 'Related Domains lists nothing');
  const alien = rd.filter((d) => !domains.has(d.text)).map((d) => d.text);
  if (alien.length) fail(file, 'UF-4', `not a domain page: ${alien.join(', ')}`);
  if (level === 'L3' && nextUp.has(title)) fail(file, 'UF-2', "under 'Next to implement' but declared L3");

  // the state of an issue lives on GitHub; a copy here is wrong the day the issue changes
  for (const line of (section(bare, 'Related GitHub Scope') ?? '').split('\n')) {
    if (/\b(?:Open|Closed)\.?\s*$/.test(line)) {
      fail(file, 'ISSUESTATE', `issue state copied into Related GitHub Scope: ${line.trim().slice(-60)}`);
    }
  }
}

// ---- generated blocks (tools/README.md, Writes into ssot/) ----
try {
  const current = readFileSync(MAP, 'utf8');
  if (regenerate(current) !== current) {
    fail(
      MAP,
      'GENERATED',
      'the generated block is not what `npm run generate:traceability` writes now; change the use case, not the block, and regenerate',
    );
  }
  const size = words(current);
  if (size > MAP_BUDGET_WORDS) {
    warn(
      MAP,
      'MAPSIZE',
      `${size} words, over the budget of ${MAP_BUDGET_WORDS} - see tools/README.md`,
    );
  }
} catch (error) {
  fail(MAP, 'GENERATED', error.message);
}

// ---- the always-read entry (AGENTS.md, `## Always Read`) ----
{
  const agents = readFileSync('AGENTS.md', 'utf8');
  const always =
    /^## Always Read\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(
      stripFences(agents),
    )?.[1] ?? '';
  const named = [...always.matchAll(/^\s*(?:-|\d+\.) .*?`([^`]+\.md)`/gm)].map(
    (m) => m[1],
  );
  if (!named.length)
    fail(
      'AGENTS.md',
      'ENTRY',
      'no `## Always Read` section listing documents in backticks',
    );
  let total = words(agents);
  const counts = [`AGENTS.md ${total}`];
  for (const path of named) {
    if (!exists(path)) {
      fail(
        'AGENTS.md',
        'ENTRY',
        `always-read document does not exist: ${path}`,
      );
      continue;
    }
    const n = words(readFileSync(path, 'utf8'));
    total += n;
    counts.push(`${path} ${n}`);
  }
  if (total > ENTRY_BUDGET_WORDS) {
    warn(
      'AGENTS.md',
      'ENTRY',
      `always-read documents total ${total} words, over the budget of ${ENTRY_BUDGET_WORDS} (${counts.join(', ')}) - see tools/README.md`,
    );
  }
}

const byRule = (list) => {
  const map = new Map();
  for (const f of list) map.set(f.rule, [...(map.get(f.rule) ?? []), f]);
  return [...map].sort();
};
const print = (log, groups) => {
  for (const [rule, list] of groups) {
    log(`${rule} (${list.length})`);
    for (const f of list) log(`  ${f.file}: ${f.message}`);
    log('');
  }
};

const warned = warnings.length ? `, ${warnings.length} warning(s)` : ', no warnings';
if (!failures.length) {
  console.log(`check-ssot: ${files.length} pages, no failures${warned}.`);
  if (warnings.length) {
    console.log('\nWarnings (these do not fail the check):\n');
    print(console.log, byRule(warnings));
  }
  process.exit(0);
}
const failed = byRule(failures);
console.error(`check-ssot: ${failures.length} failure(s) across ${failed.length} rule(s)${warned}.\n`);
print(console.error, failed);
if (warnings.length) {
  console.error('Warnings (these do not fail the check):\n');
  print(console.error, byRule(warnings));
}
process.exit(1);

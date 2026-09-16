#!/usr/bin/env node
/**
 * Structural checks for the SSOT. Run: npm run check:ssot
 *
 * The SSOT is plain markdown that has to stay navigable from GitHub, so the rules
 * below are the ones a reader cannot see being broken: a link that resolves to
 * nothing, a leftover Logseq wikilink, an issue number that does not link, and the
 * use-case format rules in ssot/overview/use-case-format.md.
 *
 * Exits non-zero on the first failing category, listing every failure.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';

const SSOT = resolve('ssot');
// `Claude outputs` is where the Claude desktop app drops files; it is git-ignored.
const SKIP = new Set(['assets', 'Claude outputs']);
const failures = [];
const fail = (file, rule, message) =>
  failures.push({ file: relative('.', file), rule, message });

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
}

const byRule = new Map();
for (const f of failures) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
if (!failures.length) {
  console.log(`check-ssot: ${files.length} pages, no failures.`);
  process.exit(0);
}
console.error(`check-ssot: ${failures.length} failure(s) across ${byRule.size} rule(s).\n`);
for (const [rule, list] of [...byRule].sort()) {
  console.error(`${rule} (${list.length})`);
  for (const f of list) console.error(`  ${f.file}${sep === '\\' ? '' : ''}: ${f.message}`);
  console.error('');
}
process.exit(1);

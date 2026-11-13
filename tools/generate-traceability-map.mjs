#!/usr/bin/env node
/**
 * Writes the generated block of ssot/overview/traceability-map.md.
 * Run: npm run generate:traceability
 *
 * The block is the part of the map a use case already states about itself:
 *
 * - Domain To Use Cases, from each use case's `Related Domains`.
 * - Use Cases To Epics, from each use case's `Related GitHub Scope`. An epic is an
 *   issue reference written `epic-NNNN`, preceded by the word `epic`, or linking to
 *   `ssot/history/records/epic-*.md`. Individual issues are not listed.
 *
 * Only the text between the two markers is rewritten; every line outside them is left
 * as it is. check-ssot (rule GENERATED) fails when the block differs from what this
 * script would write now, so a use case changed without regenerating fails CI, and so
 * does a hand edit inside the block.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SSOT = join(ROOT, 'ssot');
const USE_CASES = join(SSOT, 'use-cases');
export const MAP = join(SSOT, 'overview', 'traceability-map.md');
export const START = '<!-- generated:traceability:start -->';
export const END = '<!-- generated:traceability:end -->';
const ISSUES = 'https://github.com/muhammedgaygisiz/travellers-apps/issues/';

const stripFences = (text) =>
  text.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '');
const section = (text, name) => {
  const part = text
    .split(/^## /m)
    .slice(1)
    .find((p) => p.split('\n')[0].trim() === name);
  return part === undefined ? '' : part.slice(part.indexOf('\n') + 1);
};
const links = (text) =>
  [...text.matchAll(/\[([^\]]+)]\(([^)\s]+)\)/g)].map((m) => ({
    text: m[1],
    target: m[2],
  }));
const fromMap = (absolute) =>
  relative(dirname(MAP), absolute).split(sep).join('/');

/** epic numbers named in a `Related GitHub Scope`, in ascending order */
export function epicsIn(scope) {
  const found = new Set();
  for (const m of scope.matchAll(/\bepic-(\d{2,5})\b/gi))
    found.add(Number(m[1]));
  for (const m of scope.matchAll(/\bepic\s+\[?#(\d{2,5})\b/gi))
    found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
}

function useCases() {
  return readdirSync(USE_CASES)
    .filter((f) => f.startsWith('uc-') && f.endsWith('.md'))
    .map((f) => {
      const text = stripFences(readFileSync(join(USE_CASES, f), 'utf8'));
      return {
        title: /^# (.+?)\s*$/m.exec(text)?.[1] ?? f,
        path: fromMap(join(USE_CASES, f)),
        domains: links(section(text, 'Related Domains')).map((l) => ({
          name: l.text,
          path: fromMap(resolve(USE_CASES, l.target.split('#')[0])),
        })),
        epics: epicsIn(section(text, 'Related GitHub Scope')),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'en'));
}

/** domains in the order the SSOT index lists them, then any it does not list */
function domainOrder() {
  const index = readFileSync(join(SSOT, 'README.md'), 'utf8');
  const part = index.split('## Domain\n')[1]?.split('\n## ')[0] ?? '';
  return links(part).map((l) => l.text);
}

/** the block, markers included */
export function render() {
  const ucs = useCases();
  const byDomain = new Map();
  for (const uc of ucs) {
    for (const d of uc.domains) {
      const entry = byDomain.get(d.name) ?? { path: d.path, ucs: [] };
      entry.ucs.push(uc);
      byDomain.set(d.name, entry);
    }
  }
  const order = domainOrder();
  const rank = (name) =>
    order.includes(name) ? order.indexOf(name) : order.length;
  const domains = [...byDomain].sort(
    ([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'en'),
  );
  const ucLink = (uc) => `[${uc.title}](${uc.path})`;
  const lines = [
    START,
    '<!-- Written by `npm run generate:traceability`. Do not edit by hand: check-ssot fails on any difference. -->',
    '',
    '## Domain To Use Cases',
    '',
    ...domains.map(
      ([name, d]) => `- [${name}](${d.path}): ${d.ucs.map(ucLink).join(', ')}`,
    ),
    '',
    '## Use Cases To Epics',
    '',
    ...ucs.map((uc) => {
      const epics = uc.epics
        .map((n) => `[epic-${n}](${ISSUES}${n})`)
        .join(', ');
      return `- ${ucLink(uc)}: ${epics || 'none'}`;
    }),
    '',
    END,
  ];
  return lines.join('\n');
}

/** the map with its block replaced; throws when the markers are missing */
export function regenerate(text) {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error(
      `${relative(ROOT, MAP)}: no block between ${START} and ${END}`,
    );
  }
  return text.slice(0, start) + render() + text.slice(end + END.length);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const before = readFileSync(MAP, 'utf8');
  const after = regenerate(before);
  if (after === before)
    console.log(
      `generate-traceability-map: ${relative(ROOT, MAP)} is up to date.`,
    );
  else {
    writeFileSync(MAP, after);
    console.log(
      `generate-traceability-map: rewrote the generated block of ${relative(ROOT, MAP)}.`,
    );
  }
}

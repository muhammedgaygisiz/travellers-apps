/**
 * The `CONTEXT` rule of check-ssot.mjs: the context view cannot fall behind the code.
 *
 * An external system leaves signals in the repository: a runtime dependency, a hostname
 * in a URL, a third-party action, a configuration key. The rule collects every signal
 * that exists and requires each one to be claimed, either by a system on
 * ssot/architecture/context.md, whose `Signals` column lists the signals that belong to
 * it, or by tools/check-ssot-baseline.json, which holds the signals that are not
 * integrations. The baseline is written by `npm run check:ssot -- --accept` and never by
 * hand. The rule does not judge a signal; it fails on a new one until someone has.
 *
 * A library, not an entry point: check-ssot.mjs runs it.
 */
import { readFileSync, writeFileSync } from 'node:fs';

export const CONTEXT_PAGE = 'ssot/architecture/context.md';
export const BASELINE = 'tools/check-ssot-baseline.json';

const MANIFESTS = ['package.json', 'apps/bite-tribe-firebase/functions/package.json'];
const SHARED_ENV = 'tools/env-var-plugin.js';
const FUNCTIONS_SRC = 'apps/bite-tribe-firebase/functions/src/';

// The kinds of signal, as the baseline file groups them and as a message names them.
const KINDS = {
  packages: 'runtime dependency',
  hostnames: 'hostname',
  actions: 'third-party action',
  keys: 'configuration key',
};

const read = (path) => readFileSync(path, 'utf8');
const blank = (s) => s.replace(/[^\n]/g, ' ');

/**
 * The text with its comments blanked out, so offsets still hold. HTML comments go in
 * every file, because components carry templates; `/* *\/` and `//` comments go
 * everywhere but in .html. A `//` counts only after whitespace or punctuation, which
 * keeps the `//` of `https://` and leaves a protocol-relative `'//host'` alone.
 */
function uncomment(text, path) {
  let out = text.replace(/<!--[\s\S]*?-->/g, blank);
  if (path.endsWith('.html')) return out;
  out = out.replace(/(^|\s)(\/\*[\s\S]*?\*\/)/gm, (_, lead, c) => lead + blank(c));
  return out.replace(/(^|[\s;,(){}[\]])(\/\/[^\n]*)/gm, (_, lead, c) => lead + blank(c));
}

// skipped: tests, stories, the e2e apps, and apps/cv, which is outside the BiteTribe domain
const skipped = (path) =>
  /(^|\/)__specs__\//.test(path) ||
  /\.(spec|stories)\.ts$/.test(path) ||
  /^apps\/[^/]+-e2e\//.test(path) ||
  path.startsWith('apps/cv/');

const scanned = (path) =>
  (/^(apps|libs)\/.+\.(ts|html|scss|css)$/.test(path) || /^tools\/.+\.mjs$/.test(path)) &&
  !skipped(path);

/**
 * The hostname of a URL's authority: no user, no port, lower case, and no label that is a
 * template placeholder, so `{s}.tile.openstreetmap.org` is `tile.openstreetmap.org` and
 * `${host}` is nothing.
 */
function hostname(authority) {
  const host = authority
    .replace(/^[^@]*@/, '')
    .replace(/:[^.]*$/, '')
    .split('.')
    .filter((label) => label && !/[{}$]/.test(label))
    .join('.')
    .toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(host) ? host : null;
}

/**
 * Whether the URL at `at` is a link a user follows or an XML namespace: the value of an
 * `href` on an `<a>` element, or of an `xmlns` attribute. A `<link href>` loads a
 * resource and stays a signal.
 */
function filtered(text, at) {
  const before = text.slice(Math.max(0, at - 2000), at);
  if (/\bxmlns(?::[\w-]+)?\s*=\s*["']?$/.test(before)) return true;
  const open = before.lastIndexOf('<');
  if (open < 0) return false;
  const tag = before.slice(open);
  return !tag.includes('>') && /^<a\s[\s\S]*?\[?\bhref]?\s*=\s*["']?'?$/i.test(tag);
}

/** every signal in the tree, as `kind -> value -> [files]`, plus what could not be read */
function collect(files) {
  const found = Object.fromEntries(Object.keys(KINDS).map((k) => [k, new Map()]));
  const problems = [];
  const add = (kind, value, file) => {
    const map = found[kind];
    if (!map.has(value)) map.set(value, []);
    if (!map.get(value).includes(file)) map.get(value).push(file);
  };

  // runtime dependencies; devDependencies are build tools and never run in production
  for (const manifest of MANIFESTS) {
    try {
      for (const name of Object.keys(JSON.parse(read(manifest)).dependencies ?? {})) {
        add('packages', name, manifest);
      }
    } catch (error) {
      problems.push([manifest, `the dependencies cannot be read: ${error.message}`]);
    }
  }

  // hostnames in URLs, outside comments, links and XML namespaces
  for (const path of files.filter(scanned)) {
    let text;
    try { text = uncomment(read(path), path); } catch { continue; }
    for (const m of text.matchAll(/\bhttps?:\/\/([^\s/?#'"`)<>\\]+)/g)) {
      if (filtered(text, m.index)) continue;
      const host = hostname(m[1]);
      if (host) add('hostnames', host, path);
    }
  }

  // actions from outside GitHub (`actions/`) and outside the repository (`./`), in the
  // workflows and in the composite actions they call
  for (const path of files.filter((p) =>
    /^\.github\/(workflows\/[^/]+|actions\/.+\/action)\.ya?ml$/.test(p))) {
    for (const m of read(path).matchAll(/^\s*(?:-\s+)?uses:\s*["']?([^\s"'#]+)/gm)) {
      const action = m[1].split('@')[0];
      if (!action.startsWith('./') && !action.startsWith('actions/')) add('actions', action, path);
    }
  }

  // the keys each app inlines, with the shared lists of tools/env-var-plugin.js resolved
  const shared = new Map();
  try {
    for (const m of uncomment(read(SHARED_ENV), SHARED_ENV)
      .matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)]/g)) {
      shared.set(m[1], [...m[2].matchAll(/'([^']+)'|"([^"]+)"/g)].map((s) => s[1] ?? s[2]));
    }
  } catch (error) {
    problems.push([SHARED_ENV, `the shared keys cannot be read: ${error.message}`]);
  }
  for (const path of files.filter((p) => /^apps\/[^/]+\/env-var-plugin\.js$/.test(p))) {
    const list = /\ballowedKeys\s*:\s*\[([\s\S]*?)]/.exec(uncomment(read(path), path));
    if (!list) {
      problems.push([path, 'no `allowedKeys: [...]` to read']);
      continue;
    }
    for (const m of list[1].matchAll(/'([^']+)'|"([^"]+)"|\.\.\.\s*([A-Za-z_$][\w$]*)/g)) {
      if (!m[3]) add('keys', m[1] ?? m[2], path);
      else if (shared.has(m[3])) for (const key of shared.get(m[3])) add('keys', key, path);
      else problems.push([path, `\`...${m[3]}\` in \`allowedKeys\` is not a list in \`${SHARED_ENV}\``]);
    }
  }

  // the parameters of the Functions; a name may be a constant declared in the same file
  for (const path of files.filter((p) =>
    p.startsWith(FUNCTIONS_SRC) && p.endsWith('.ts') && !skipped(p))) {
    let text;
    try { text = uncomment(read(path), path); } catch { continue; }
    const calls = /\bdefine(?:Secret|String|Int|Boolean)\s*\(\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`|([A-Za-z_$][\w$]*))/g;
    for (const m of text.matchAll(calls)) {
      const literal = m[1] ?? m[2] ?? m[3];
      if (literal !== undefined) {
        add('keys', literal, path);
        continue;
      }
      const constant = new RegExp(
        `\\b(?:const|let|var)\\s+${m[4].replace(/\$/g, '\\$')}\\s*(?::\\s*[\\w.]+\\s*)?=\\s*(?:'([^']*)'|"([^"]*)"|\`([^\`$]*)\`)`,
      ).exec(text);
      if (constant) add('keys', constant[1] ?? constant[2] ?? constant[3], path);
      else problems.push([path, `\`${m[4]}\` is passed to a \`define*\` call but is not a string constant of this file`]);
    }
  }
  return { found, problems };
}

/** the `Signals` column of `Technical Context`: each token with the system that claims it */
function claims(text) {
  const section = /^## Technical Context\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text)?.[1];
  if (section === undefined) return { error: 'no `## Technical Context` section' };
  const rows = section.split('\n').filter((l) => l.startsWith('|'));
  const cells = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
  const column = rows.length ? cells(rows[0]).indexOf('Signals') : -1;
  if (column < 0) return { error: 'the `Technical Context` table has no `Signals` column' };
  const tokens = [];
  for (const row of rows.slice(1)) {
    if (/^\|\s*:?-+/.test(row)) continue;
    const c = cells(row);
    for (const m of (c[column] ?? '').matchAll(/`([^`\n]+)`/g)) {
      tokens.push({ token: m[1], system: c[0] });
    }
  }
  return { tokens };
}

/**
 * Whether a page token claims a signal: the same name; a package or action by its scope
 * or owner with a trailing `/*`; a key by its prefix with a trailing `*`; a hostname
 * together with its subdomains.
 */
function claimed(kind, value, token) {
  if (value === token) return true;
  if (token.endsWith('*')) return value.startsWith(token.slice(0, -1));
  return kind === 'hostnames' && token.includes('.') && value.endsWith(`.${token}`);
}

/**
 * The baseline as prettier writes it, so that `--accept` and the pre-commit hook agree:
 * a list that fits on one line within 80 columns is written on one line.
 */
function serialise(baseline) {
  const entries = Object.entries(baseline).map(([key, value]) => {
    const head = `  ${JSON.stringify(key)}: `;
    if (!Array.isArray(value)) return head + JSON.stringify(value);
    const flat = `${head}[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
    if (flat.length + 1 <= 80) return flat;
    return `${head}[\n${value.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n  ]`;
  });
  return `{\n${entries.join(',\n')}\n}\n`;
}

/**
 * Runs the rule. `files` is the working tree as check-ssot reads it; `accept` rewrites the
 * baseline to hold every signal the page does not claim. Returns a line to print, or null.
 */
export function checkContext({ files, fail, warn, accept = false }) {
  const { found, problems } = collect(files);
  for (const [file, message] of problems) fail(file, 'CONTEXT', message);

  let page;
  try {
    page = claims(read(CONTEXT_PAGE));
  } catch {
    page = { error: 'the context view does not exist' };
  }
  if (page.error) {
    fail(CONTEXT_PAGE, 'CONTEXT', page.error);
    return null;
  }

  let baseline = {};
  let missing = false;
  try {
    baseline = JSON.parse(read(BASELINE));
  } catch (error) {
    if (error.code === 'ENOENT') missing = true;
    else if (!accept) {
      fail(BASELINE, 'CONTEXT', `cannot be read: ${error.message}; regenerate it with \`npm run check:ssot -- --accept\``);
    }
  }

  const unclaimed = Object.fromEntries(Object.keys(KINDS).map((k) => [k, []]));
  for (const [kind, values] of Object.entries(found)) {
    for (const [value, where] of [...values].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (page.tokens.some(({ token }) => claimed(kind, value, token))) continue;
      unclaimed[kind].push(value);
      if (accept || (baseline[kind] ?? []).includes(value)) continue;
      const more = where.length > 1 ? ` (and ${where.length - 1} more file(s))` : '';
      fail(
        where[0],
        'CONTEXT',
        `${KINDS[kind]} \`${value}\`${more} is claimed by no system: add it to the \`Signals\` of the system it belongs to on \`${CONTEXT_PAGE}\`, or, if it is not an integration, run \`npm run check:ssot -- --accept\`${missing ? ` (\`${BASELINE}\` does not exist yet)` : ''}`,
      );
    }
  }

  for (const { token, system } of page.tokens) {
    const live = Object.entries(found).some(([kind, values]) =>
      [...values.keys()].some((value) => claimed(kind, value, token)));
    if (!live) {
      warn(
        CONTEXT_PAGE,
        'CONTEXT',
        `\`${token}\`, a signal of ${system}, no longer occurs in the code; remove it, and the row if the system is gone`,
      );
    }
  }

  if (!accept) return null;
  const next = { $comment: 'Written by `npm run check:ssot -- --accept`; do not edit by hand. See tools/README.md.', ...unclaimed };
  const before = new Set(Object.keys(KINDS).flatMap((k) => (baseline[k] ?? []).map((v) => `${k}\0${v}`)));
  const after = new Set(Object.keys(KINDS).flatMap((k) => next[k].map((v) => `${k}\0${v}`)));
  const added = [...after].filter((e) => !before.has(e)).length;
  const removed = [...before].filter((e) => !after.has(e)).length;
  const text = serialise(next);
  let current = null;
  try { current = read(BASELINE); } catch { /* written below */ }
  if (current === text) return `check-ssot --accept: ${BASELINE} is up to date.`;
  writeFileSync(BASELINE, text);
  return `check-ssot --accept: wrote ${BASELINE}, ${added} signal(s) added, ${removed} removed.`;
}

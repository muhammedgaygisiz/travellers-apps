import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, relative, resolve } from 'node:path';

/**
 * Asserts that a production web bundle is fit to be wrapped natively.
 *
 * This is the check step 2 of ssot/pages/Release Workflow.md describes as a
 * pair of greps. A human running it by hand is exactly the part issue #1181
 * set out to remove, so the native release jobs run this instead and fail on a
 * bad bundle rather than shipping it.
 *
 * The dev-only key list is imported from the env-var plugin rather than
 * repeated here, so adding a key to `DEV_ONLY_ENV_KEYS` also starts asserting
 * it. See ssot/pages/Implementation - Release And Build Workflow.md.
 */
const require = createRequire(import.meta.url);
const { DEV_ONLY_ENV_KEYS } = require('./env-var-plugin');

const BUNDLE_DIR = resolve(process.argv[2] ?? 'dist/apps/bite-tribe');

// Only files that can carry an inlined `process.env` object literal, or the
// text the build copies verbatim. Everything else in the bundle is an image or
// a font.
const SCANNED_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.json',
  '.map',
  '.txt',
  '.webmanifest',
]);

const REQUIRED_ENTRY = {
  key: 'NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED',
  value: 'true',
};

// The minifier decides how to quote, and it does not always decide the same
// way: the build of commit 297f8be4 emits the value side of an inlined entry
// as the template literal `true`, on which the double-quoted grep the SSOT
// used to prescribe finds nothing. Accept every quote form, because which one
// is emitted is not a property this check is about.
const QUOTE = '["\'`]';

if (!existsAsDirectory(BUNDLE_DIR)) {
  fail(
    [
      `No bundle at ${BUNDLE_DIR}.`,
      'Build it first:',
      '  NX_APP_BITE_TRIBE_APP_CHECK_ENFORCED=true npx nx build bite-tribe --configuration=production',
    ].join('\n'),
  );
}

const files = [...textFiles(BUNDLE_DIR)];

if (files.length === 0) {
  fail(`${BUNDLE_DIR} holds no readable bundle files.`);
}

const problems = [
  ...DEV_ONLY_ENV_KEYS.flatMap((key) => findForbiddenKey(key, files)),
  ...findRequiredEntry(files),
];

console.log(
  `Checked ${files.length} bundle files in ${relative(process.cwd(), BUNDLE_DIR)}.`,
);

if (problems.length > 0) {
  fail(
    ['The bundle must not be wrapped natively:', '', ...problems].join('\n'),
  );
}

for (const key of DEV_ONLY_ENV_KEYS) {
  console.log(`  ok  ${key} is not inlined`);
}
console.log(
  `  ok  ${REQUIRED_ENTRY.key} is inlined as ${REQUIRED_ENTRY.value}`,
);

/**
 * A dev-only key is a finding only when it is inlined as an object key.
 *
 * The bare name also appears as the string constant the runtime lookup uses,
 * in every build. The trailing colon is what separates "this build carries the
 * value" from "this build can read the value if something sets it".
 */
function findForbiddenKey(key, files) {
  const pattern = new RegExp(`${QUOTE}?${key}${QUOTE}?\\s*:`);
  const findings = [];

  for (const { path, content } of files) {
    const match = pattern.exec(content);

    if (match) {
      // The offset locates it; the value is never printed. One of these keys
      // is a real credential, and a CI log is not the place to reprint it.
      findings.push(
        `  ${key} is inlined in ${relative(BUNDLE_DIR, path)} ` +
          `at offset ${match.index}`,
      );
    }
  }

  return findings;
}

function findRequiredEntry(files) {
  const pattern = new RegExp(
    `${QUOTE}?${REQUIRED_ENTRY.key}${QUOTE}?\\s*:\\s*` +
      `${QUOTE}${REQUIRED_ENTRY.value}${QUOTE}`,
  );

  if (files.some(({ content }) => pattern.test(content))) {
    return [];
  }

  return [
    `  ${REQUIRED_ENTRY.key} is not inlined as ${REQUIRED_ENTRY.value}.`,
    '  The App Check gate defaults to off, so a build without the variable',
    '  wraps native artifacts with enforcement disabled (issue #1177).',
  ];
}

function* textFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* textFiles(path);
    } else if (entry.isFile() && SCANNED_EXTENSIONS.has(extname(entry.name))) {
      yield { path, content: readFileSync(path, 'utf8') };
    }
  }
}

function existsAsDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

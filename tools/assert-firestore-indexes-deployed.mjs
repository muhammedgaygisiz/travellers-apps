/**
 * Fails when a Firestore index or single-field exemption that
 * `apps/bite-tribe-firebase/firestore.indexes.json` declares is not present in
 * the live project.
 *
 * This is the preflight the `deploy-functions` job runs before it deploys.
 * `firebase deploy --only functions` never touches indexes, and the Firestore
 * API builds one in the background while the CLI returns immediately, so the
 * index deploy stays a separate, manual step that has to finish first. Issue
 * #1227 is what happens when it does not: a collection-group query without its
 * exemption compiles, passes the emulator, passes every unit test, and then
 * fails in production with `FAILED_PRECONDITION`.
 *
 * The check is a subset check, not an equality check. An index in production
 * that the file no longer declares is harmless - it costs storage until someone
 * removes it - while one the file declares and production lacks is the
 * failure mode above. Unknown properties (`density`, `multikey`, `apiScope`,
 * `ttl`) are ignored so a new Firestore field cannot fail a correct deploy.
 *
 * Usage, from the workspace root:
 *
 *   npm run firestore:assert-indexes-deployed
 *
 * Reads credentials from `GOOGLE_APPLICATION_CREDENTIALS` or an interactive
 * `firebase login`, and needs `datastore.indexes.list` on the project.
 *
 * See GitHub issue #1464.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import client from 'firebase-tools';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'bite-tribe';

const INDEXES_FILE = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  'apps/bite-tribe-firebase/firestore.indexes.json',
);

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

/**
 * The direction of a single indexed field. Firestore names it `order` for a
 * scalar, `arrayConfig` for an array membership index and `vectorConfig` for an
 * embedding, and exactly one of them is ever set.
 */
const fieldDirection = (field) =>
  field.order ?? field.arrayConfig ?? (field.vectorConfig ? 'VECTOR' : 'NONE');

const indexKey = (index) =>
  [
    index.collectionGroup,
    index.queryScope ?? 'COLLECTION',
    (index.fields ?? [])
      .map((field) => `${field.fieldPath}:${fieldDirection(field)}`)
      .join(','),
  ].join(' | ');

const fieldOverrideKeys = (override) =>
  (override.indexes ?? []).map((index) =>
    [
      override.collectionGroup,
      override.fieldPath,
      index.queryScope ?? 'COLLECTION',
      fieldDirection(index),
    ].join(' | '),
  );

const readCommittedSpec = async () => {
  const contents = await readFile(INDEXES_FILE, 'utf8').catch((error) =>
    fail(`Could not read ${INDEXES_FILE}: ${error.message}`),
  );

  try {
    return JSON.parse(contents);
  } catch (error) {
    return fail(`${INDEXES_FILE} is not valid JSON: ${error.message}`);
  }
};

const readDeployedSpec = async () => {
  try {
    return await client.firestore.indexes({
      project: PROJECT_ID,
      nonInteractive: true,
    });
  } catch (error) {
    return fail(
      `Could not list the indexes deployed to '${PROJECT_ID}': ${error.message}\n` +
        'The check needs `datastore.indexes.list` on the project.',
    );
  }
};

const [committed, deployed] = await Promise.all([
  readCommittedSpec(),
  readDeployedSpec(),
]);

const deployedIndexes = new Set((deployed.indexes ?? []).map(indexKey));
const deployedOverrides = new Set(
  (deployed.fieldOverrides ?? []).flatMap(fieldOverrideKeys),
);

const missingIndexes = (committed.indexes ?? [])
  .map(indexKey)
  .filter((key) => !deployedIndexes.has(key));

const missingOverrides = (committed.fieldOverrides ?? [])
  .flatMap(fieldOverrideKeys)
  .filter((key) => !deployedOverrides.has(key));

const missing = [...missingIndexes, ...missingOverrides];

const committedCount =
  (committed.indexes ?? []).length +
  (committed.fieldOverrides ?? []).flatMap(fieldOverrideKeys).length;

if (missing.length) {
  fail(
    [
      `${missing.length} index definition(s) in apps/bite-tribe-firebase/firestore.indexes.json are not deployed to '${PROJECT_ID}':`,
      '',
      ...missing.map((key) => `  ${key}`),
      '',
      'Deploy them first and wait for every one to reach READY, then re-run this job:',
      '',
      '  npx nx run bite-tribe-firebase:firebase-deploy-indexes',
      '',
      'The CLI returns before the build finishes, so watch the console rather than the command:',
      `  https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/-default-/indexes/automatic?selectedTab=automatic`,
      '',
      'A function that needs an index must not go live before the index is READY. See issue #1227.',
    ].join('\n'),
  );
}

console.log(
  `All ${committedCount} index definition(s) declared for '${PROJECT_ID}' are deployed.`,
);

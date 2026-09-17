/**
 * Waits until every Firestore index and single-field exemption that
 * `apps/bite-tribe-firebase/firestore.indexes.json` declares is present in the
 * live project **and finished building**, and fails when it is not.
 *
 * The `deploy-firestore-indexes` job runs it immediately after deploying the
 * specification, and `deploy-functions` needs that job, so no function goes
 * live ahead of an index its query needs. `firebase deploy --only
 * firestore:indexes` starts a background build and returns immediately, so
 * deploying an index is not the same as having one: a
 * `collectionGroup(x).where(field, ...)` against an index still in `CREATING`
 * fails in production with `FAILED_PRECONDITION`. That is issue #1227, and
 * deploying the index from CI without this wait would leave it exactly as
 * reachable while reporting success.
 *
 * It replaces `assert-firestore-indexes-deployed.mjs`, which could not see
 * build state at all and did not compare correctly either. That version read
 * the deployed set through `firebase-tools`' `firestore:indexes` command, whose
 * `makeIndexSpec` builds the shape of the specification file and drops `state`
 * on the way - so a `CREATING` index was indistinguishable from a finished one,
 * and every composite index read back one field longer than the committed file
 * declares it. This reads the Firestore Admin API directly instead.
 *
 * The presence half stays a subset check, not an equality check. An index in
 * production that the file no longer declares is harmless - it costs storage
 * until someone removes it - while one the file declares and production lacks
 * is the failure above. Unknown properties (`density`, `multikey`, `apiScope`,
 * `ttl`) are ignored so a new Firestore field cannot fail a correct deploy.
 *
 * Usage, from the workspace root:
 *
 *   npm run firestore:assert-indexes-ready
 *
 * Reads Application Default Credentials: `GOOGLE_APPLICATION_CREDENTIALS` in
 * CI, or `gcloud auth application-default login` on a workstation. A
 * `firebase login` is not enough, unlike the version this replaces - that one
 * borrowed the CLI's own credentials, and this talks to the API directly.
 *
 * It needs `datastore.indexes.list` and `datastore.operations.list`, both of
 * which the read-only `roles/datastore.viewer` carries. It never deploys, so it
 * is safe to run with a credential that cannot.
 *
 * See GitHub issues #1567 and #1227.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'bite-tribe';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID ?? '(default)';

/**
 * How long to keep waiting for a build, and how often to look.
 *
 * An index build is proportional to the data already in the collection, so
 * there is no duration that is right for every index. Twenty minutes covers
 * every index this project has built so far and still ends the run rather than
 * holding a deploy open indefinitely; a build that needs longer fails the job,
 * and re-running it after the build finishes passes without a code change.
 */
const TIMEOUT_MS =
  Number(process.env.FIRESTORE_INDEX_WAIT_SECONDS ?? 1200) * 1000;
const POLL_INTERVAL_MS =
  Number(process.env.FIRESTORE_INDEX_POLL_SECONDS ?? 15) * 1000;

const INDEXES_FILE = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  'apps/bite-tribe-firebase/firestore.indexes.json',
);

const API_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;

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

/**
 * `__name__` is dropped from both sides before comparing. A live composite
 * index always carries the document name as a trailing field, and
 * `firestore.indexes.json` never declares it - `firebase deploy` appends it to
 * the committed specification on the way out (`FirestoreApi.processIndex`).
 * Comparing the two without removing it reports every composite index in the
 * file as missing, which is what the previous version of this check did: it
 * failed `deploy-functions` on `develop` against two indexes that were
 * deployed and `READY`, and the functions stopped shipping until someone read
 * the log closely enough to disbelieve it.
 */
const indexKey = (index) =>
  [
    index.collectionGroup,
    index.queryScope ?? 'COLLECTION',
    (index.fields ?? [])
      .filter((field) => field.fieldPath !== '__name__')
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

/**
 * `projects/p/databases/d/collectionGroups/<group>/indexes/<id>` and the
 * matching `.../fields/<path>`. The resource name is the only place the
 * collection group and field path appear on a live index.
 */
const parseResourceName = (name) => {
  const match = /collectionGroups\/([^/]+)\/(?:indexes|fields)\/(.+)$/.exec(
    name ?? '',
  );

  return match
    ? { collectionGroup: match[1], leaf: match[2] }
    : { collectionGroup: '', leaf: '' };
};

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

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/datastore'],
});

let authClient;

/** Every list endpoint here pages, and every one of them pages the same way. */
const getAll = async (path, collectionKey, searchParams = {}) => {
  authClient ??= await auth.getClient();

  const items = [];
  let pageToken;

  do {
    const url = new URL(`${API_ROOT}${path}`);

    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const { data } = await authClient.request({ url: url.toString() });

    items.push(...(data[collectionKey] ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
};

const readLiveState = async () => {
  const [indexes, fields, operations] = await Promise.all([
    getAll('/collectionGroups/-/indexes', 'indexes'),
    getAll('/collectionGroups/-/fields', 'fields', {
      filter: 'indexConfig.usesAncestorConfig=false OR ttlConfig:*',
    }),
    getAll('/operations', 'operations'),
  ]);

  return { indexes, fields, operations };
};

/**
 * The state of each live composite index, by the same key the committed
 * specification is reduced to.
 */
const liveIndexStates = (indexes) =>
  new Map(
    indexes.map((index) => [
      indexKey({
        collectionGroup: parseResourceName(index.name).collectionGroup,
        queryScope: index.queryScope,
        fields: index.fields,
      }),
      index.state,
    ]),
  );

const liveOverrideStates = (fields) =>
  new Map(
    fields
      .filter((field) => !(field.name ?? '').includes('__default__'))
      .flatMap((field) => {
        const { collectionGroup, leaf } = parseResourceName(field.name);

        return (field.indexConfig?.indexes ?? []).map((index) => [
          [
            collectionGroup,
            leaf,
            index.queryScope ?? 'COLLECTION',
            fieldDirection(index.fields?.[0] ?? {}),
          ].join(' | '),
          index.state,
        ]);
      }),
  );

/**
 * A second build signal, behind the per-index `state` above. Index and
 * field-override builds both surface as long-running operations on the
 * database, and an operation appears as soon as the build is requested - before
 * the index itself is listable - so this closes the window where a just-issued
 * deploy has nothing to look at yet. Unrelated operations, an import or an
 * export, are ignored: they are not something a function deploy has to wait
 * for.
 */
const unfinishedBuilds = (operations) =>
  operations.filter(
    (operation) =>
      !operation.done &&
      /IndexOperationMetadata|FieldOperationMetadata/.test(
        operation.metadata?.['@type'] ?? '',
      ),
  );

/**
 * The Firestore Admin API reports `state` on every composite index and on every
 * index inside a field override, verified against the live project on
 * 17 September 2026. It is absent only if that stops being true, and treating
 * an absent state as "not ready" would then hold every deploy for the whole
 * timeout before failing it - so an unknown state falls back to the operations
 * signal above.
 */
const isReady = (state) => state === undefined || state === 'READY';

const committed = await readCommittedSpec();

const committedIndexes = (committed.indexes ?? []).map(indexKey);
const committedOverrides = (committed.fieldOverrides ?? []).flatMap(
  fieldOverrideKeys,
);
const committedCount = committedIndexes.length + committedOverrides.length;

const deadline = Date.now() + TIMEOUT_MS;
let attempt = 0;
let missing = [];
let building = [];

for (;;) {
  attempt += 1;

  const live = await readLiveState().catch((error) =>
    fail(
      `Could not read the Firestore index state of '${PROJECT_ID}': ${error.message}\n` +
        'The check needs `datastore.indexes.list` and `datastore.operations.list` on the project.',
    ),
  );

  const indexStates = liveIndexStates(live.indexes);
  const overrideStates = liveOverrideStates(live.fields);

  missing = [
    ...committedIndexes.filter((key) => !indexStates.has(key)),
    ...committedOverrides.filter((key) => !overrideStates.has(key)),
  ];

  building = [
    ...committedIndexes
      .filter((key) => indexStates.has(key) && !isReady(indexStates.get(key)))
      .map((key) => `${key}  [${indexStates.get(key)}]`),
    ...committedOverrides
      .filter(
        (key) => overrideStates.has(key) && !isReady(overrideStates.get(key)),
      )
      .map((key) => `${key}  [${overrideStates.get(key)}]`),
    ...unfinishedBuilds(live.operations).map(
      (operation) => `${operation.name}  [operation in progress]`,
    ),
  ];

  if (!missing.length && !building.length) {
    console.log(
      `All ${committedCount} index definition(s) declared for '${PROJECT_ID}' are deployed and READY.`,
    );
    process.exit(0);
  }

  if (Date.now() + POLL_INTERVAL_MS >= deadline) {
    break;
  }

  console.log(
    `Attempt ${attempt}: ${missing.length} missing, ${building.length} still building. ` +
      `Waiting ${POLL_INTERVAL_MS / 1000}s.`,
  );

  await sleep(POLL_INTERVAL_MS);
}

fail(
  [
    `Firestore indexes for '${PROJECT_ID}' were not ready within ${TIMEOUT_MS / 1000}s.`,
    '',
    ...(missing.length
      ? [
          `${missing.length} definition(s) in apps/bite-tribe-firebase/firestore.indexes.json are not deployed:`,
          '',
          ...missing.map((key) => `  ${key}`),
          '',
        ]
      : []),
    ...(building.length
      ? [
          `${building.length} definition(s) are deployed but still building:`,
          '',
          ...building.map((key) => `  ${key}`),
          '',
        ]
      : []),
    'An index build is proportional to the data already in the collection, so a large',
    'one can outlast this wait. Nothing is wrong with the deploy in that case: watch the',
    'build and re-run this job, which passes once it finishes.',
    '',
    `  https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/-default-/indexes/automatic?selectedTab=automatic`,
    '',
    'A function that needs an index must not go live before the index is READY. See issue #1227.',
  ].join('\n'),
);

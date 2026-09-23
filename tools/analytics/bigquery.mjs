/**
 * Shared helpers for the BigQuery half of the analytics tooling: project and
 * dataset resolution, an authenticated REST client, and a query runner.
 *
 * The GA4 Data API is aggregated and quota-limited. The GA4 → BigQuery export
 * writes the raw event stream into `analytics_<propertyId>`, which is what
 * funnels, cohorts and Firestore joins need. Used by
 * `provision-bigquery.mjs` (link management) and `query.mjs` (checked-in SQL).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail } from './ga4.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const QUERIES_DIR = path.join(HERE, 'queries');

/**
 * Where the export dataset is created. GA4 fixes this at link creation and it
 * cannot be changed afterwards, so it is a deliberate default rather than an
 * incidental one: BiteTribe's users are in the EU, and [[issue-989]] (consent
 * mode + PII review) is easier to answer with the raw event data held in the
 * EU multi-region.
 */
export const DEFAULT_DATASET_LOCATION = 'EU';

export const BIGQUERY_SETUP_HINT =
  'BigQuery access is not configured. See tools/analytics/README.md ' +
  '(enable the GA4 → BigQuery export with `npm run analytics:bigquery -- --apply`, ' +
  'then grant the service account roles/bigquery.jobUser on the project and ' +
  'roles/bigquery.dataViewer on the export dataset).';

/** BigQuery REST needs an explicit scope; the SDK defaults do not cover it. */
const BIGQUERY_SCOPE = 'https://www.googleapis.com/auth/bigquery';

const API_ROOT = 'https://bigquery.googleapis.com/bigquery/v2';

/** How long a single `jobs.query` call may block before we poll instead. */
const QUERY_TIMEOUT_MS = 30_000;

/** Ceiling on polls for a query that did not finish inside the first call. */
const MAX_POLLS = 20;

export function bigQueryFail(message) {
  console.error(`error: ${message}`);
  console.error(`\n${BIGQUERY_SETUP_HINT}`);
  process.exit(1);
}

/**
 * The Cloud project that holds the export dataset. Defaults to the project of
 * the service-account key, which is the Firebase project in every setup we
 * have; `BIGQUERY_PROJECT_ID` overrides it for a separate analytics project.
 */
export function tryResolveProjectId() {
  if (process.env.BIGQUERY_PROJECT_ID) return process.env.BIGQUERY_PROJECT_ID;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    try {
      const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      if (key.project_id) return key.project_id;
    } catch {
      return null;
    }
  }
  return null;
}

export function resolveProjectId() {
  const projectId = tryResolveProjectId();
  if (projectId) return projectId;
  return fail(
    'Could not determine the BigQuery project. Set BIGQUERY_PROJECT_ID in tools/analytics/.env.',
    { hint: true },
  );
}

export function resolveDatasetLocation() {
  return process.env.BIGQUERY_DATASET_LOCATION || DEFAULT_DATASET_LOCATION;
}

/** GA4 always names the export dataset after the numeric property id. */
export function datasetIdFor(propertyId) {
  return `analytics_${propertyId}`;
}

/**
 * Raised instead of exiting when a caller asked for `soft` handling.
 *
 * `query.mjs` is run by a person who wants to know their credentials are
 * wrong, so it exits. The digest runs unattended at 06:00 and posts one
 * comment a day: a missing dataset or a revoked role there has to degrade to a
 * line in the output rather than take the whole daily artifact down, the way a
 * missing custom dimension already does on the GA4 side.
 */
export class BigQueryUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BigQueryUnavailableError';
  }
}

/** Query ids (file basenames), sorted, with their leading comment as summary. */
export function availableQueries() {
  if (!fs.existsSync(QUERIES_DIR)) return [];
  return fs
    .readdirSync(QUERIES_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => {
      const id = file.slice(0, -'.sql'.length);
      const first = fs
        .readFileSync(path.join(QUERIES_DIR, file), 'utf8')
        .split('\n')[0];
      return { id, summary: first.replace(/^--\s?/, '').trim() };
    });
}

/** The SQL of a checked-in query, by id. */
export function readCheckedInQuery(id) {
  const file = path.join(QUERIES_DIR, `${id}.sql`);
  if (!fs.existsSync(file)) {
    const known = availableQueries()
      .map((q) => q.id)
      .join(', ');
    fail(`Unknown query "${id}". Available: ${known || '(none)'}.`);
  }
  return fs.readFileSync(file, 'utf8');
}

/** `YYYYMMDD` for `daysAgo` days before today, in UTC to match `event_date`. */
export function suffixDate(daysAgo) {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

/**
 * The wildcard events table, fully qualified.
 *
 * `events_*` also matches `events_intraday_*`, but the `_TABLE_SUFFIX` window
 * every query applies excludes them: `intraday_20260923` sorts above any
 * `YYYYMMDD` string, so a daily query never silently mixes in a partial day.
 */
export function eventsTableRef({ projectId, datasetId, intraday }) {
  const prefix = intraday ? 'events_intraday_' : 'events_';
  return `\`${projectId}.${datasetId}.${prefix}*\``;
}

/** Fill the `${EVENTS_TABLE}` placeholder a checked-in query declares. */
export function resolveQuerySql(sql, table) {
  return sql.replaceAll('${EVENTS_TABLE}', table);
}

/** Lazily create an authenticated REST client scoped for BigQuery. */
export async function createBigQueryClient() {
  let GoogleAuth;
  try {
    ({ GoogleAuth } = await import('google-auth-library'));
  } catch {
    fail(
      'The "google-auth-library" package is not installed. Run `npm install` first.',
    );
  }
  return new GoogleAuth({ scopes: [BIGQUERY_SCOPE] }).getClient();
}

async function request(client, { url, method = 'GET', data }) {
  return client.request({ url: `${API_ROOT}${url}`, method, data });
}

/**
 * Dataset metadata, or `null` when the export has not created it yet.
 *
 * A missing dataset is the normal state between enabling the link and the
 * first delivery, so it is a value rather than an error; everything else
 * (denied, disabled API) still exits loudly.
 */
export async function getDataset(client, projectId, datasetId, { soft } = {}) {
  try {
    const res = await request(client, {
      url: `/projects/${projectId}/datasets/${datasetId}`,
    });
    return res.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    if (soft) throw asUnavailable(error);
    handleBigQueryError(error);
    return null; // unreachable — handleBigQueryError exits
  }
}

/** Table ids in the export dataset, oldest first, or `[]` when there is none. */
export async function listTables(client, projectId, datasetId) {
  const tables = [];
  let pageToken;
  do {
    const query = pageToken
      ? `?pageToken=${encodeURIComponent(pageToken)}`
      : '';
    let res;
    try {
      res = await request(client, {
        url: `/projects/${projectId}/datasets/${datasetId}/tables${query}`,
      });
    } catch (error) {
      if (error?.response?.status === 404) return [];
      handleBigQueryError(error);
      return []; // unreachable — handleBigQueryError exits
    }
    for (const table of res.data.tables ?? []) {
      tables.push(table.tableReference.tableId);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return tables.sort();
}

function namedParameters(params) {
  return Object.entries(params).map(([name, value]) => ({
    name,
    parameterType: { type: 'STRING' },
    parameterValue: { value: String(value) },
  }));
}

/**
 * Turn BigQuery's `{ f: [{ v }] }` rows into plain objects keyed by column.
 *
 * Only scalar columns are decoded to their JS type; anything nested (GA4's
 * `event_params` for instance) is left as the raw JSON so a query that selects
 * a struct still prints something honest instead of `[object Object]`.
 */
export function decodeRows(schema, rows = []) {
  const fields = schema?.fields ?? [];
  return rows.map((row) =>
    Object.fromEntries(
      fields.map((field, index) => [
        field.name,
        decodeCell(field, row.f?.[index]?.v),
      ]),
    ),
  );
}

function decodeCell(field, value) {
  if (value === null || value === undefined) return null;
  if (field.mode === 'REPEATED' || field.type === 'RECORD') {
    return JSON.stringify(value);
  }
  if (['INTEGER', 'FLOAT', 'NUMERIC', 'BIGNUMERIC'].includes(field.type)) {
    return Number(value);
  }
  if (field.type === 'BOOLEAN') return value === 'true' || value === true;
  return value;
}

/**
 * Run SQL and return `{ rows, totalBytesProcessed }`.
 *
 * `location` must match the dataset, because BigQuery resolves jobs per
 * location and a mismatch reports the dataset as missing rather than as a
 * wrong region.
 */
export async function runQuery(
  client,
  { projectId, sql, params = {}, location, maxRows = 200, soft = false },
) {
  let res;
  try {
    res = await request(client, {
      url: `/projects/${projectId}/queries`,
      method: 'POST',
      data: {
        query: sql,
        useLegacySql: false,
        location,
        timeoutMs: QUERY_TIMEOUT_MS,
        maxResults: maxRows,
        ...(Object.keys(params).length > 0
          ? { parameterMode: 'NAMED', queryParameters: namedParameters(params) }
          : {}),
      },
    });
  } catch (error) {
    if (soft) throw asUnavailable(error);
    handleBigQueryError(error);
    return { rows: [], totalBytesProcessed: 0 }; // unreachable
  }

  let payload = res.data;
  let polls = 0;
  while (!payload.jobComplete && polls < MAX_POLLS) {
    polls += 1;
    const { jobId, location: jobLocation } = payload.jobReference;
    const search = new URLSearchParams({
      maxResults: String(maxRows),
      timeoutMs: String(QUERY_TIMEOUT_MS),
      ...(jobLocation ? { location: jobLocation } : {}),
    });
    try {
      const poll = await request(client, {
        url: `/projects/${projectId}/queries/${jobId}?${search}`,
      });
      payload = poll.data;
    } catch (error) {
      if (soft) throw asUnavailable(error);
      handleBigQueryError(error);
    }
  }

  if (!payload.jobComplete) {
    const message =
      `BigQuery job did not finish within ${(MAX_POLLS * QUERY_TIMEOUT_MS) / 1000}s. ` +
      'Re-run, or narrow the window with --days.';
    if (soft) throw new BigQueryUnavailableError(message);
    fail(message);
  }

  return {
    rows: decodeRows(payload.schema, payload.rows),
    totalBytesProcessed: Number(payload.totalBytesProcessed ?? 0),
  };
}

/** The message `handleBigQueryError` would have printed, as a throwable. */
function asUnavailable(error) {
  return new BigQueryUnavailableError(
    String(error?.response?.data?.error?.message ?? error?.message ?? error),
  );
}

export function handleBigQueryError(error) {
  const message = String(
    error?.response?.data?.error?.message ?? error?.message ?? error,
  );
  if (
    /Access Denied|PERMISSION_DENIED|permission|UNAUTHENTICATED|credential|has not been used|SERVICE_DISABLED|Not found: Dataset/i.test(
      message,
    )
  ) {
    bigQueryFail(message);
  }
  fail(message);
}

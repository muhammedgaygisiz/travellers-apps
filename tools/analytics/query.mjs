/**
 * Run a checked-in SQL query against the GA4 → BigQuery export.
 *
 * Queries live in `tools/analytics/queries/*.sql` so analysis is reviewable
 * and reproducible instead of pasted into the console once. Each file may use
 * two placeholders the runner fills in:
 *
 *   ${EVENTS_TABLE}          the wildcard events table, fully qualified
 *   @start_date/@end_date    the window as `YYYYMMDD` strings, for _TABLE_SUFFIX
 *
 * Usage:
 *   node tools/analytics/query.mjs --list
 *   node tools/analytics/query.mjs event-counts [--days=7] [--json] [--dry-run]
 *
 * See tools/analytics/README.md for the one-time BigQuery access setup.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fail, loadEnv, resolvePropertyId } from './ga4.mjs';
import {
  QUERIES_DIR,
  createBigQueryClient,
  datasetIdFor,
  getDataset,
  resolveDatasetLocation,
  resolveProjectId,
  runQuery,
  tryResolveProjectId,
} from './bigquery.mjs';

loadEnv();

const USAGE = `Run a checked-in SQL query against the BigQuery export

Usage:
  node tools/analytics/query.mjs --list
  node tools/analytics/query.mjs <query> [--days=7] [--json] [--dry-run] [--intraday]

Options:
  --list       List the checked-in queries and exit.
  --days=<n>   Look back window in days (default 7).
  --json       Emit JSON instead of a table.
  --dry-run    Print the resolved SQL without calling BigQuery (no credentials
               required).
  --intraday   Read the streaming \`events_intraday_*\` tables instead of the
               daily ones. Only useful when streaming export is enabled.
  --max-rows=<n>
               Cap the returned rows (default 200).
  --help       Show this help.`;

function parseArgs(argv) {
  const args = {
    query: null,
    days: 7,
    json: false,
    dryRun: false,
    intraday: false,
    maxRows: 200,
    list: false,
    help: false,
  };
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--list') args.list = true;
    else if (raw === '--json') args.json = true;
    else if (raw === '--dry-run') args.dryRun = true;
    else if (raw === '--intraday') args.intraday = true;
    else if (raw.startsWith('--days=')) {
      args.days = positiveInt(raw, '--days=');
    } else if (raw.startsWith('--max-rows=')) {
      args.maxRows = positiveInt(raw, '--max-rows=');
    } else if (raw.startsWith('--')) {
      fail(`Unknown argument "${raw}". Try --help.`);
    } else if (args.query) {
      fail(`Only one query at a time, got "${args.query}" and "${raw}".`);
    } else {
      args.query = raw;
    }
  }
  return args;
}

function positiveInt(raw, prefix) {
  const value = raw.slice(prefix.length);
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) {
    fail(`${prefix.slice(0, -1)} must be a positive integer, got "${value}".`);
  }
  return n;
}

/** Query ids (file basenames), sorted, with their leading comment as summary. */
function availableQueries() {
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

function readQuery(id) {
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
function suffixDate(daysAgo) {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function eventsTable({ projectId, datasetId, intraday }) {
  const prefix = intraday ? 'events_intraday_' : 'events_';
  return `\`${projectId}.${datasetId}.${prefix}*\``;
}

function resolveSql(sql, table) {
  return sql.replaceAll('${EVENTS_TABLE}', table);
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log('(no rows)');
    return;
  }
  const columns = Object.keys(rows[0]);
  console.log(`| ${columns.join(' | ')} |`);
  console.log(`| ${columns.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    console.log(`| ${columns.map((c) => row[c] ?? '').join(' | ')} |`);
  }
}

function runDryRun(args) {
  const propertyId = process.env.GA4_PROPERTY_ID || '<GA4_PROPERTY_ID>';
  const projectId = tryResolveProjectId() ?? '<BIGQUERY_PROJECT_ID>';
  const params = {
    start_date: suffixDate(args.days),
    end_date: suffixDate(0),
  };
  const sql = resolveSql(
    readQuery(args.query),
    eventsTable({
      projectId,
      datasetId: datasetIdFor(propertyId),
      intraday: args.intraday,
    }),
  );

  if (args.json) {
    console.log(
      JSON.stringify({ dryRun: true, query: args.query, params, sql }, null, 2),
    );
    return;
  }
  console.log(`DRY RUN — ${args.query} (last ${args.days} days)\n`);
  console.log(`Parameters: ${JSON.stringify(params)}\n`);
  console.log(sql);
}

async function runLive(args) {
  const propertyId = resolvePropertyId();
  const projectId = resolveProjectId();
  const datasetId = datasetIdFor(propertyId);

  const client = await createBigQueryClient();
  // The dataset carries the location the link was created with, and a query
  // sent to the wrong location reports the dataset as missing rather than as a
  // region mismatch. Reading it first turns that into a clear message.
  const dataset = await getDataset(client, projectId, datasetId);
  if (!dataset) {
    fail(
      `Dataset ${projectId}.${datasetId} does not exist yet. Check the export ` +
        'with `npm run analytics:bigquery -- --status`; GA4 creates the dataset ' +
        'with the first delivery, up to 24h after the link is enabled.',
    );
  }

  const params = {
    start_date: suffixDate(args.days),
    end_date: suffixDate(0),
  };
  const sql = resolveSql(
    readQuery(args.query),
    eventsTable({ projectId, datasetId, intraday: args.intraday }),
  );

  const { rows, totalBytesProcessed } = await runQuery(client, {
    projectId,
    sql,
    params,
    location: dataset.location ?? resolveDatasetLocation(),
    maxRows: args.maxRows,
  });

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          query: args.query,
          days: args.days,
          params,
          totalBytesProcessed,
          rows,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    `${args.query} — ${params.start_date}…${params.end_date} ` +
      `(${projectId}.${datasetId})\n`,
  );
  printTable(rows);
  console.log(`\n${rows.length} rows, ${totalBytesProcessed} bytes scanned.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args.list) {
    for (const q of availableQueries()) console.log(`- ${q.id} — ${q.summary}`);
    return;
  }
  if (!args.query) {
    fail('Pass a query id, or --list to see the checked-in queries.');
  }
  if (args.dryRun) {
    runDryRun(args);
    return;
  }
  await runLive(args);
}

main().catch((error) => fail(String(error?.message ?? error)));

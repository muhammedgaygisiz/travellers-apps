/**
 * Launch analytics metrics report (snapshot).
 *
 * Runs the dashboard-as-code tiles (`dashboard.config.mjs`) against the
 * Google Analytics Data API (GA4) and prints the launch metrics, so agents and
 * humans can check analytics without opening the console.
 *
 * Usage:
 *   node tools/analytics/report.mjs [--days=7] [--json] [--dry-run]
 *
 * Env (auto-loaded from tools/analytics/.env if present):
 *   GA4_PROPERTY_ID                 numeric GA4 property id (required for live run)
 *   GOOGLE_APPLICATION_CREDENTIALS  path to a service-account JSON key
 *
 * See tools/analytics/README.md for one-time setup.
 */

import {
  buildRequest,
  consoleTiles,
  createClient,
  currentWindow,
  fail,
  loadEnv,
  queryableTiles,
  resolvePropertyId,
  runValue,
} from './ga4.mjs';

loadEnv();

const USAGE = `Launch analytics metrics report

Usage:
  node tools/analytics/report.mjs [--days=7] [--json] [--dry-run]

Options:
  --days=<n>   Look back window in days (default 7).
  --json       Emit JSON instead of a table.
  --dry-run    Print the planned GA4 Data API requests without calling the API
               (no credentials required).
  --help       Show this help.`;

function parseArgs(argv) {
  const args = { days: 7, json: false, dryRun: false, help: false };
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--json') args.json = true;
    else if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--days=')) {
      const n = Number.parseInt(raw.slice('--days='.length), 10);
      if (!Number.isInteger(n) || n < 1) {
        fail(`--days must be a positive integer, got "${raw.slice(7)}".`);
      }
      args.days = n;
    } else {
      fail(`Unknown argument "${raw}". Try --help.`);
    }
  }
  return args;
}

function printManual() {
  const manual = consoleTiles();
  if (manual.length === 0) return;
  console.log('Manual (console-only) tiles:');
  for (const tile of manual) {
    console.log(`- ${tile.id} — ${tile.title} → ${tile.source}`);
  }
}

function runDryRun({ days, json }) {
  const propertyId = process.env.GA4_PROPERTY_ID || '<GA4_PROPERTY_ID>';
  const planned = queryableTiles().map((tile) => ({
    id: tile.id,
    title: tile.title,
    category: tile.category,
    request: buildRequest(tile, propertyId, currentWindow(days)),
  }));

  if (json) {
    console.log(
      JSON.stringify(
        { dryRun: true, days, tiles: planned, manual: consoleTiles() },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`DRY RUN — planned GA4 Data API requests (last ${days} days)\n`);
  for (const tile of planned) {
    console.log(`▸ ${tile.id} — ${tile.title} [${tile.category}]`);
    console.log(`${JSON.stringify(tile.request, null, 2)}\n`);
  }
  printManual();
}

async function runLive({ days, json }) {
  const propertyId = resolvePropertyId();
  const client = await createClient();

  const results = [];
  for (const tile of queryableTiles()) {
    const value = await runValue(
      client,
      buildRequest(tile, propertyId, currentWindow(days)),
    );
    results.push({
      id: tile.id,
      title: tile.title,
      category: tile.category,
      value,
    });
  }

  if (json) {
    console.log(
      JSON.stringify(
        { days, propertyId, tiles: results, manual: consoleTiles() },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Launch metrics — last ${days} days (property ${propertyId})\n`);
  console.log('| Metric | Category | Value |');
  console.log('| --- | --- | --- |');
  for (const r of results) {
    console.log(`| ${r.title} | ${r.category} | ${r.value} |`);
  }
  console.log('');
  printManual();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args.dryRun) {
    runDryRun(args);
    return;
  }
  await runLive(args);
}

main().catch((error) => fail(String(error?.message ?? error)));

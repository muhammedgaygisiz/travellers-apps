/**
 * Daily launch-analytics digest.
 *
 * Computes each dashboard tile for the current window and the previous window
 * of the same length, reports the delta, and raises threshold alerts from
 * `dashboard.config.mjs`. Output is Markdown (default) or JSON (`--json`),
 * suitable for posting to a GitHub issue from CI (see the analytics-digest
 * workflow).
 *
 * Usage:
 *   node tools/analytics/digest.mjs [--days=7] [--json] [--dry-run]
 *
 * Env (auto-loaded from tools/analytics/.env if present):
 *   GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS  (see README.md)
 */

import {
  breakdownTiles,
  consoleTiles,
  createClient,
  currentWindow,
  fail,
  loadEnv,
  previousWindow,
  queryableTiles,
  resolvePropertyId,
  runBreakdown,
  runTileValue,
} from './ga4.mjs';

loadEnv();

const USAGE = `Daily launch-analytics digest

Usage:
  node tools/analytics/digest.mjs [--days=7] [--json] [--dry-run]

Options:
  --days=<n>   Window length in days for the current and previous periods (default 7).
  --json       Emit JSON instead of Markdown.
  --dry-run    Show the windows and thresholds without calling the API.
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

/** Render a tile value, honouring its unit. `null` means "no data". */
function formatValue(tile, value) {
  if (value === null) return 'n/a';
  return tile.unit === '%' ? `${value}%` : String(value);
}

function evaluateAlerts(tile, now, prev) {
  const alerts = [];
  const expect = tile.expect;
  // A tile with no data for the window cannot breach a threshold, and
  // asserting that it did would raise an alert about the window rather than
  // about the app.
  if (!expect || now === null) return alerts;

  const show = (v) => formatValue(tile, v);

  if (typeof expect.min === 'number' && now < expect.min) {
    alerts.push(
      `${tile.title}: ${show(now)} in window (expected ≥ ${show(expect.min)}).`,
    );
  }
  if (prev !== null && prev > 0) {
    const changePct = ((now - prev) / prev) * 100;
    if (
      typeof expect.maxDropPct === 'number' &&
      -changePct > expect.maxDropPct
    ) {
      alerts.push(
        `${tile.title}: down ${(-changePct).toFixed(0)}% vs previous window ` +
          `(${show(prev)} → ${show(now)}, threshold ${expect.maxDropPct}%).`,
      );
    }
    if (
      typeof expect.maxRisePct === 'number' &&
      changePct > expect.maxRisePct
    ) {
      alerts.push(
        `${tile.title}: up ${changePct.toFixed(0)}% vs previous window ` +
          `(${show(prev)} → ${show(now)}, threshold ${expect.maxRisePct}%).`,
      );
    }
  }
  return alerts;
}

function formatDelta(tile, now, prev) {
  if (now === null || prev === null) return '–';

  const diff = now - prev;
  if (diff === 0) return '–';
  const sign = diff > 0 ? '+' : '';

  // Percentages move in percentage points; "+1%" on a 99% crash-free rate
  // would read as a relative change and overstate a one-point move.
  if (tile.unit === '%') {
    return `${sign}${Math.round(diff * 100) / 100} pp`;
  }
  if (prev > 0) {
    const pct = Math.round((diff / prev) * 100);
    return `${sign}${diff} (${sign}${pct}%)`;
  }
  return `${sign}${diff}`;
}

function toMarkdown({ date, days, propertyId, rows, breakdowns, alerts }) {
  const lines = [];
  lines.push(`## Launch analytics digest — ${date}`);
  lines.push('');
  lines.push(
    `Window: last ${days} days vs previous ${days} days · property \`${propertyId}\``,
  );
  lines.push('');
  lines.push('| Metric | Category | Now | Prev | Δ |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const r of rows) {
    lines.push(
      `| ${r.title} | ${r.category} | ${r.nowText} | ${r.prevText} | ${r.delta} |`,
    );
  }
  lines.push('');
  for (const b of breakdowns) {
    lines.push(`### ${b.title}`);
    lines.push('');
    if (b.unavailable) {
      lines.push(`_Unavailable: ${b.unavailable}_`);
    } else if (b.rows.length === 0) {
      lines.push('_None in window._');
    } else {
      for (const row of b.rows) lines.push(`- ${row.value} × ${row.label}`);
    }
    lines.push('');
  }
  if (alerts.length > 0) {
    lines.push('### ⚠️ Alerts');
    for (const a of alerts) lines.push(`- ${a}`);
  } else {
    lines.push('### ✅ No threshold alerts');
  }
  lines.push('');
  const manual = consoleTiles();
  if (manual.length > 0) {
    lines.push(
      'Console-only (check manually): ' +
        manual.map((t) => `${t.title} (${t.source})`).join('; ') +
        '.',
    );
    lines.push('');
  }
  lines.push('<sub>Generated by tools/analytics/digest.mjs</sub>');
  return lines.join('\n');
}

function runDryRun({ days }) {
  const propertyId = process.env.GA4_PROPERTY_ID || '<GA4_PROPERTY_ID>';
  console.log(`DRY RUN — daily digest plan (property ${propertyId})\n`);
  console.log(`Current window:  ${JSON.stringify(currentWindow(days))}`);
  console.log(`Previous window: ${JSON.stringify(previousWindow(days))}\n`);
  console.log('Tiles + thresholds:');
  for (const tile of queryableTiles()) {
    const expect = tile.expect ? JSON.stringify(tile.expect) : 'no thresholds';
    console.log(`- ${tile.id} — ${tile.title} → ${expect}`);
  }
  const breakdowns = breakdownTiles();
  if (breakdowns.length > 0) {
    console.log('\nBreakdowns (current window only):');
    for (const tile of breakdowns) {
      console.log(
        `- ${tile.id} — ${tile.title} → top ${tile.limit ?? 5} by ${tile.dimension}`,
      );
    }
  }
}

async function runLive({ days, json }) {
  const propertyId = resolvePropertyId();
  const client = await createClient();

  const rows = [];
  const alerts = [];
  for (const tile of queryableTiles()) {
    const now = await runTileValue(
      client,
      tile,
      propertyId,
      currentWindow(days),
    );
    const prev = await runTileValue(
      client,
      tile,
      propertyId,
      previousWindow(days),
    );
    rows.push({
      id: tile.id,
      title: tile.title,
      category: tile.category,
      now,
      prev,
      nowText: formatValue(tile, now),
      prevText: formatValue(tile, prev),
      delta: formatDelta(tile, now, prev),
    });
    alerts.push(...evaluateAlerts(tile, now, prev));
  }

  // Breakdowns are current-window only: a ranked list is read to decide what to
  // open in Crashlytics next, not to compare against last week.
  const breakdowns = [];
  for (const tile of breakdownTiles()) {
    const result = await runBreakdown(
      client,
      tile,
      propertyId,
      currentWindow(days),
    );
    breakdowns.push({ id: tile.id, title: tile.title, ...result });
  }

  const date = new Date().toISOString().slice(0, 10);
  const payload = { date, days, propertyId, rows, breakdowns, alerts };

  if (json) {
    console.log(
      JSON.stringify({ ...payload, manual: consoleTiles() }, null, 2),
    );
    return;
  }
  console.log(toMarkdown(payload));
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

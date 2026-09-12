/**
 * Shared helpers for the analytics tooling: dashboard tiles, GA4 Data API
 * request building, credential handling, and a dependency-free `.env` loader.
 *
 * Used by `report.mjs` (snapshot) and `digest.mjs` (daily digest + alerts).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DASHBOARD_TILES } from './dashboard.config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SETUP_HINT =
  'Analytics credentials are not configured. See tools/analytics/README.md ' +
  '(create a service account, grant it Viewer on the GA4 property, enable the ' +
  'Google Analytics Data API, then set GA4_PROPERTY_ID and ' +
  'GOOGLE_APPLICATION_CREDENTIALS).';

export function fail(message, { hint = false } = {}) {
  console.error(`error: ${message}`);
  if (hint) console.error(`\n${SETUP_HINT}`);
  process.exit(1);
}

/**
 * Load `tools/analytics/.env` into process.env if present, without a dependency.
 * Existing environment variables (e.g. from CI) always win.
 */
export function loadEnv() {
  const envPath = path.join(HERE, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Tiles that resolve to a single number (rendered as a table row). */
export function queryableTiles() {
  return DASHBOARD_TILES.filter(
    (t) => t.type !== 'console' && t.type !== 'breakdown',
  );
}

/** Tiles that resolve to a ranked list (rendered as their own section). */
export function breakdownTiles() {
  return DASHBOARD_TILES.filter((t) => t.type === 'breakdown');
}

export function consoleTiles() {
  return DASHBOARD_TILES.filter((t) => t.type === 'console');
}

/** gRPC status code GA4 returns for a dimension it does not know. */
const INVALID_ARGUMENT = 3;

/**
 * The user-scoped dimension naming which app a session came from (#1098).
 *
 * All three apps report to one property through one measurement id, and since
 * issue 1098 the business app reports at all - so `activeUsers` counts staff
 * shifts alongside app users unless a request says otherwise. Auto-collected
 * events carry no name that distinguishes them, which is why the separation is
 * a user property rather than an event filter.
 */
const SURFACE_DIMENSION = 'customUser:app_surface';

/** GA4 dimension filter restricting a request to a tile's event names. */
function eventNameFilter(events) {
  return {
    filter: {
      fieldName: 'eventName',
      inListFilter: { values: events },
    },
  };
}

/** GA4 dimension filter restricting a request to one app's sessions. */
function surfaceFilter(surface) {
  return {
    filter: {
      fieldName: SURFACE_DIMENSION,
      stringFilter: { matchType: 'EXACT', value: surface },
    },
  };
}

/**
 * The filters a request needs, as one expression.
 *
 * Returns the single filter unwrapped and `undefined` for none, so a tile that
 * declares no surface builds exactly the request it built before this existed -
 * which is what keeps a change to the user-count tiles from quietly restating
 * every other one.
 */
function allOf(filters) {
  const present = filters.filter(Boolean);

  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];

  return { andGroup: { expressions: present } };
}

/** The same tile with its surface dropped, for the unfiltered fallback. */
function unscoped(tile) {
  return { ...tile, surface: undefined };
}

/**
 * Whether a surface filter had to be dropped because GA4 does not know the
 * dimension yet.
 *
 * Module state rather than a changed return type, because the value a caller
 * needs back is still a number and threading a second one through
 * `runTileValue` would reach `digest.mjs`'s alert arithmetic for a fact that
 * belongs in its prose. The flag is set at most once per process and read after
 * every tile has run.
 */
let surfaceFilterDropped = false;

/**
 * True once any tile fell back to an unfiltered request.
 *
 * `report.mjs` and `digest.mjs` print a line when it is, so a figure that looks
 * scoped to the consumer app and one that is not are never indistinguishable.
 */
export function surfaceFilterUnavailable() {
  return surfaceFilterDropped;
}

export const SURFACE_UNAVAILABLE_NOTE =
  `GA4 does not know the \`${SURFACE_DIMENSION}\` dimension yet, so the user ` +
  'counts in this run are unfiltered and include business-app sessions. ' +
  'Register it with `npm run analytics:provision -- --apply`; GA4 does not ' +
  'backfill, so the separation starts from the day it is registered.';

/**
 * Build a GA4 Data API `runReport` request for a queryable tile over a date
 * range. `dateRange` is `{ startDate, endDate }` using GA4 relative dates such
 * as `7daysAgo` / `today`.
 */
export function buildRequest(tile, propertyId, dateRange) {
  const request = {
    property: `properties/${propertyId}`,
    dateRanges: [dateRange],
  };

  const surface = tile.surface ? surfaceFilter(tile.surface) : undefined;

  if (tile.type === 'activeUsers') {
    request.metrics = [{ name: tile.metric ?? 'activeUsers' }];

    if (surface) {
      request.dimensionFilter = surface;
    }

    return request;
  }

  // eventCount
  request.metrics = [{ name: 'eventCount' }];
  request.dimensionFilter = allOf([eventNameFilter(tile.events), surface]);
  return request;
}

/**
 * The two requests behind a `crashFreeUsers` tile: all active users in the
 * window, and the subset who triggered one of the tile's events. GA4 has no
 * crash-free metric, so the rate is derived from these rather than read.
 */
export function buildCrashFreeRequests(tile, propertyId, dateRange) {
  const base = {
    property: `properties/${propertyId}`,
    dateRanges: [dateRange],
    metrics: [{ name: 'activeUsers' }],
  };
  // On both halves or on neither. A total counted over everyone against an
  // affected subset counted over one app is a rate over two populations, and
  // the direction of the error is the flattering one.
  const surface = tile.surface ? surfaceFilter(tile.surface) : undefined;

  return {
    total: { ...base, ...(surface ? { dimensionFilter: surface } : {}) },
    affected: {
      ...base,
      dimensionFilter: allOf([eventNameFilter(tile.events), surface]),
    },
  };
}

/** Build the top-N grouped request behind a `breakdown` tile. */
export function buildBreakdownRequest(tile, propertyId, dateRange) {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [dateRange],
    dimensions: [{ name: tile.dimension }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventNameFilter(tile.events),
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: tile.limit ?? 5,
  };
}

/**
 * All the requests a tile needs, so a dry run can print exactly what a live run
 * would send.
 */
export function buildRequests(tile, propertyId, dateRange) {
  if (tile.type === 'crashFreeUsers') {
    const { total, affected } = buildCrashFreeRequests(
      tile,
      propertyId,
      dateRange,
    );
    return [total, affected];
  }
  if (tile.type === 'breakdown') {
    return [buildBreakdownRequest(tile, propertyId, dateRange)];
  }
  return [buildRequest(tile, propertyId, dateRange)];
}

/** Current window `{ startDate, endDate }` for the last `days` days. */
export function currentWindow(days) {
  return { startDate: `${days}daysAgo`, endDate: 'today' };
}

/** The window of the `days` days immediately before the current one. */
export function previousWindow(days) {
  return { startDate: `${days * 2}daysAgo`, endDate: `${days}daysAgo` };
}

/**
 * Validate credentials and return the numeric property id, or fail with a
 * setup-pointing message.
 */
export function resolvePropertyId() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    fail('GA4_PROPERTY_ID is not set.', { hint: true });
  }
  if (!/^\d+$/.test(propertyId)) {
    fail(
      `GA4_PROPERTY_ID must be the numeric property id, got "${propertyId}".`,
      { hint: true },
    );
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    fail('GOOGLE_APPLICATION_CREDENTIALS is not set.', { hint: true });
  }
  return propertyId;
}

/** Lazily create a GA4 Data API client (imports the SDK on demand). */
export async function createClient() {
  let BetaAnalyticsDataClient;
  try {
    ({ BetaAnalyticsDataClient } = await import('@google-analytics/data'));
  } catch {
    fail(
      'The "@google-analytics/data" package is not installed. Run `npm install` first.',
    );
  }
  return new BetaAnalyticsDataClient();
}

/**
 * Run a request and return the single scalar metric value as a number.
 *
 * `unfiltered` is the same request without its surface filter. GA4 answers a
 * dimension it has not been told about with `INVALID_ARGUMENT`, and that is a
 * provisioning gap rather than a broken digest - `runBreakdown` below has
 * degraded gracefully for exactly that since the `description` dimension, and
 * the scalar tiles now do too, because a filter that exits would take the live
 * 06:00 run down until somebody ran the provisioning command. The fallback is
 * recorded rather than swallowed: {@link surfaceFilterUnavailable} is what the
 * CLIs print from. Every other failure still exits, because a credential or
 * quota problem should be loud.
 */
export async function runValue(client, request, unfiltered) {
  try {
    const [response] = await client.runReport(request);
    return Number(response.rows?.[0]?.metricValues?.[0]?.value ?? '0');
  } catch (error) {
    if (error?.code === INVALID_ARGUMENT && unfiltered) {
      surfaceFilterDropped = true;

      return runValue(client, unfiltered);
    }

    handleApiError(error);
    return 0; // unreachable — handleApiError exits
  }
}

/**
 * Resolve a single-number tile for a window.
 *
 * Returns `null` rather than a number when the value is undefined for the
 * window instead of zero: a crash-free rate over zero active users is not
 * 100%, and reporting it as such would turn "nobody used the app" into a clean
 * bill of health.
 */
export async function runTileValue(client, tile, propertyId, dateRange) {
  // Only a tile that asked to be scoped has a fallback to offer, so an
  // `INVALID_ARGUMENT` from anything else still exits.
  const fallback = tile.surface ? unscoped(tile) : undefined;

  if (tile.type !== 'crashFreeUsers') {
    return runValue(
      client,
      buildRequest(tile, propertyId, dateRange),
      fallback && buildRequest(fallback, propertyId, dateRange),
    );
  }

  const { total, affected } = buildCrashFreeRequests(
    tile,
    propertyId,
    dateRange,
  );
  const plain = fallback
    ? buildCrashFreeRequests(fallback, propertyId, dateRange)
    : undefined;

  const totalUsers = await runValue(client, total, plain?.total);
  if (totalUsers === 0) return null;

  const affectedUsers = await runValue(client, affected, plain?.affected);
  const rate = ((totalUsers - affectedUsers) / totalUsers) * 100;
  return Math.round(rate * 100) / 100;
}

/**
 * Resolve a `breakdown` tile to `{ rows, unavailable }`, highest count first.
 *
 * A breakdown groups by a custom dimension, and GA4 rejects a dimension that
 * has not been registered on the property with `INVALID_ARGUMENT`. That is a
 * provisioning gap, not a broken digest, so it degrades to an explanatory line
 * instead of taking the daily run down with it. Every other failure still
 * exits, because a credential or quota problem should be loud.
 */
export async function runBreakdown(client, tile, propertyId, dateRange) {
  try {
    const [response] = await client.runReport(
      buildBreakdownRequest(tile, propertyId, dateRange),
    );
    return {
      rows: (response.rows ?? []).map((row) => ({
        label: row.dimensionValues?.[0]?.value || '(not set)',
        value: Number(row.metricValues?.[0]?.value ?? '0'),
      })),
      unavailable: null,
    };
  } catch (error) {
    if (error?.code === INVALID_ARGUMENT) {
      return {
        rows: [],
        unavailable:
          `GA4 rejected the \`${tile.dimension}\` dimension. Register it with ` +
          '`npm run analytics:provision -- --apply`; GA4 does not backfill, so ' +
          'the breakdown fills from the day it is registered.',
      };
    }
    handleApiError(error);
    return { rows: [], unavailable: null }; // unreachable — handleApiError exits
  }
}

export function handleApiError(error) {
  const message = String(error?.message ?? error);
  if (
    /credential|GOOGLE_APPLICATION_CREDENTIALS|PERMISSION_DENIED|UNAUTHENTICATED|API has not been used|SERVICE_DISABLED/i.test(
      message,
    )
  ) {
    fail(message, { hint: true });
  }
  fail(message);
}

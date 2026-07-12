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

export function queryableTiles() {
  return DASHBOARD_TILES.filter((t) => t.type !== 'console');
}

export function consoleTiles() {
  return DASHBOARD_TILES.filter((t) => t.type === 'console');
}

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

  if (tile.type === 'activeUsers') {
    request.metrics = [{ name: tile.metric ?? 'activeUsers' }];
    return request;
  }

  // eventCount
  request.metrics = [{ name: 'eventCount' }];
  request.dimensionFilter = {
    filter: {
      fieldName: 'eventName',
      inListFilter: { values: tile.events },
    },
  };
  return request;
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

/** Run a request and return the single scalar metric value as a number. */
export async function runValue(client, request) {
  try {
    const [response] = await client.runReport(request);
    return Number(response.rows?.[0]?.metricValues?.[0]?.value ?? '0');
  } catch (error) {
    handleApiError(error);
    return 0; // unreachable — handleApiError exits
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

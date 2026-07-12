/**
 * Dashboard-as-code: the launch monitoring tiles, defined once so the metrics
 * CLI (`report.mjs`) and the docs share a single source of truth.
 *
 * These tiles mirror the "Launch Dashboard Spec" table in
 * `ssot/pages/Implementation - Analytics Events.md`, which is derived from the
 * product event taxonomy in
 * `libs/common/ta-firestore/src/lib/analytics/analytics-events.ts`.
 *
 * Tile `type`:
 * - `eventCount`   GA4 Data API runReport, metric `eventCount`, filtered to
 *                  `events` via the `eventName` dimension.
 * - `activeUsers`  GA4 Data API runReport, metric `activeUsers`.
 * - `console`      Cannot be expressed as a single Data API call (cohort
 *                  retention, crash-free users); surfaced as a manual pointer.
 */

/** @typedef {'eventCount' | 'activeUsers' | 'console'} TileType */

/**
 * @typedef {Object} DashboardTile
 * @property {string} id
 * @property {string} title
 * @property {'Activation'|'Creation'|'Discovery'|'Retention'|'Launch monitoring'} category
 * @property {TileType} type
 * @property {string[]} [events]  event names to count (for `eventCount`)
 * @property {string} [metric]    GA4 metric (for `activeUsers`)
 * @property {string} [source]    human description for `console` tiles
 * @property {{ min?: number, maxDropPct?: number }} [expect]
 *           Alert thresholds used by `digest.mjs`:
 *           - `min`         alert if the current-window value is below this.
 *           - `maxDropPct`  alert if the value dropped more than this percent
 *                           versus the previous window.
 */

/** @type {DashboardTile[]} */
export const DASHBOARD_TILES = [
  {
    id: 'activated-users',
    title: 'New activated users / day',
    category: 'Activation',
    type: 'eventCount',
    events: ['sign_up'],
    expect: { min: 1, maxDropPct: 60 },
  },
  {
    id: 'bites-created',
    title: 'Bites created / day',
    category: 'Creation',
    type: 'eventCount',
    events: ['bite_created'],
    expect: { min: 1, maxDropPct: 60 },
  },
  {
    id: 'bucketlists-created',
    title: 'Bucket lists created / day',
    category: 'Creation',
    type: 'eventCount',
    events: ['bucketlist_created'],
  },
  {
    id: 'ratings-submitted',
    title: 'Ratings submitted / day',
    category: 'Creation',
    type: 'eventCount',
    events: ['bucketlist_rated'],
  },
  {
    id: 'searches',
    title: 'Searches / day',
    category: 'Discovery',
    type: 'eventCount',
    events: ['search_performed'],
    expect: { maxDropPct: 60 },
  },
  {
    id: 'content-views',
    title: 'Restaurant + Bite views / day',
    category: 'Discovery',
    type: 'eventCount',
    events: ['restaurant_viewed', 'bite_viewed'],
  },
  {
    id: 'active-users',
    title: 'Daily active users',
    category: 'Retention',
    type: 'activeUsers',
    metric: 'activeUsers',
  },
  {
    id: 'retention',
    title: 'D1 / D7 retention',
    category: 'Retention',
    type: 'console',
    source: 'GA4 → Retention / cohort exploration',
  },
  {
    id: 'crash-free-users',
    title: 'Crash-free users',
    category: 'Launch monitoring',
    type: 'console',
    source: 'Firebase Crashlytics (+ `exception` event in GA4)',
  },
];

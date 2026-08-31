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
 * - `eventCount`      GA4 Data API runReport, metric `eventCount`, filtered to
 *                     `events` via the `eventName` dimension.
 * - `activeUsers`     GA4 Data API runReport, metric `activeUsers`.
 * - `crashFreeUsers`  Two `activeUsers` calls - all users, and users who
 *                     triggered `events` - expressed as a percentage. This is
 *                     the GA4-derived stand-in for the Crashlytics tile; see
 *                     the note on the `crash-free-users` tile below.
 * - `breakdown`       Top `limit` values of `dimension` for `events`, by event
 *                     count. Rendered as a list rather than a single number.
 * - `console`         Cannot be expressed through the Data API at all (cohort
 *                     retention, stack traces); surfaced as a manual pointer.
 */

/**
 * @typedef {'eventCount' | 'activeUsers' | 'crashFreeUsers' | 'breakdown' | 'console'} TileType
 */

/**
 * @typedef {Object} DashboardTile
 * @property {string} id
 * @property {string} title
 * @property {'Activation'|'Creation'|'Discovery'|'Retention'|'Launch monitoring'} category
 * @property {TileType} type
 * @property {string[]} [events]  event names to count (for `eventCount`,
 *                                `crashFreeUsers` and `breakdown`)
 * @property {string} [metric]    GA4 metric (for `activeUsers`)
 * @property {string} [dimension] GA4 dimension to group by (for `breakdown`)
 * @property {number} [limit]     rows to keep (for `breakdown`, default 5)
 * @property {'%'} [unit]         display unit; percentages format and compare
 *                                in percentage points
 * @property {string} [source]    human description for `console` tiles
 * @property {{ min?: number, maxDropPct?: number, maxRisePct?: number }} [expect]
 *           Alert thresholds used by `digest.mjs`:
 *           - `min`         alert if the current-window value is below this.
 *           - `maxDropPct`  alert if the value dropped more than this percent
 *                           versus the previous window.
 *           - `maxRisePct`  alert if the value rose more than this percent
 *                           versus the previous window. For tiles where up is
 *                           the bad direction, such as error counts.
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
  // Stability. Two distinct signals, deliberately not merged into one number:
  //
  // - `app_exception` is logged by Crashlytics itself when a native process
  //   crashes, so a user counted here experienced the same event Crashlytics
  //   would report. That makes it the honest basis for a crash-free rate.
  // - `exception` is logged by `FirebaseErrorHandlerService` for every
  //   unhandled Angular error, on all three platforms. Those are usually
  //   survivable, so folding them into the crash-free rate would understate it
  //   against the Crashlytics console. They get their own count instead.
  {
    id: 'crash-free-users',
    title: 'Crash-free users',
    category: 'Launch monitoring',
    type: 'crashFreeUsers',
    events: ['app_exception'],
    unit: '%',
    expect: { min: 99 },
  },
  {
    id: 'unhandled-errors',
    title: 'Unhandled errors',
    category: 'Launch monitoring',
    type: 'eventCount',
    events: ['exception'],
    expect: { maxRisePct: 100 },
  },
  {
    id: 'top-errors',
    title: 'Top unhandled errors',
    category: 'Launch monitoring',
    type: 'breakdown',
    events: ['exception'],
    // Needs the `description` event parameter registered as a custom dimension
    // (`npm run analytics:provision -- --apply`). GA4 does not backfill a
    // dimension, so this stays empty for traffic collected before it existed.
    dimension: 'customEvent:description',
    limit: 5,
  },
  {
    id: 'crash-detail',
    title: 'Crash stack traces and non-fatals',
    category: 'Launch monitoring',
    type: 'console',
    source: 'Firebase Crashlytics → Issues',
  },
];

/**
 * The activation funnel and retention cohorts as two headline blocks for the
 * daily digest (GitHub issue #987).
 *
 * The digest's table is GA4 Data API tiles: totals for a window. These two are
 * neither — they are populations followed over time, read from the BigQuery
 * export — so they are rendered as their own sections rather than as extra
 * rows in that table, where the window in the header would misdescribe them.
 *
 * Everything here degrades instead of failing. The digest posts one comment a
 * day from CI, and a revoked BigQuery role or a dataset that has not received
 * today's delivery must not take the growth and stability numbers down with
 * it: `collectCohortHeadlines` answers `{ available: false, reason }` and the
 * digest prints the reason where the section would have been.
 */

import {
  ACTIVATION_FUNNEL_QUERY,
  ACTIVATION_STEPS,
  DIGEST_HORIZONS,
  RETENTION_COHORTS_QUERY,
} from './cohorts.config.mjs';
import { resolvePropertyId } from './ga4.mjs';
import {
  BigQueryUnavailableError,
  createBigQueryClient,
  datasetIdFor,
  eventsTableRef,
  getDataset,
  readCheckedInQuery,
  resolveDatasetLocation,
  resolveQuerySql,
  runQuery,
  suffixDate,
  tryResolveProjectId,
} from './bigquery.mjs';

/** Rows per query. A day-by-platform grid over a month stays well inside it. */
const MAX_ROWS = 500;

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD`, the shape a BigQuery `DATE` column decodes to. */
function shiftDay(day, delta) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function sumBy(rows, key) {
  return rows.reduce((total, row) => total + (row[key] ?? 0), 0);
}

function pct(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

async function runCheckedIn(
  client,
  { queryId, days, projectId, datasetId, location },
) {
  const sql = resolveQuerySql(
    readCheckedInQuery(queryId),
    eventsTableRef({ projectId, datasetId, intraday: false }),
  );
  const { rows } = await runQuery(client, {
    projectId,
    sql,
    params: { start_date: suffixDate(days), end_date: suffixDate(0) },
    location,
    maxRows: MAX_ROWS,
    soft: true,
  });
  return rows;
}

/**
 * The funnel, summed over the window and split by the surface people arrived
 * on.
 *
 * Percentages are recomputed from the sums rather than averaged across days: a
 * day with one arrival and a day with twenty are not two equal opinions about
 * the conversion rate.
 */
function summariseFunnel(rows) {
  const platforms = [...new Set(rows.map((row) => row.platform))].sort();
  const forRows = (subset, platform) => ({
    platform,
    arrived: sumBy(subset, 'arrived'),
    onboardingStarted: sumBy(subset, 'onboarding_started'),
    onboardingCompleted: sumBy(subset, 'onboarding_completed'),
    signedUp: sumBy(subset, 'signed_up'),
    firstBite: sumBy(subset, 'first_bite'),
    signupPct: pct(sumBy(subset, 'signed_up'), sumBy(subset, 'arrived')),
  });

  return {
    dataThrough: rows[0]?.data_through ?? null,
    steps: ACTIVATION_STEPS.map((step) => step.title),
    platforms: platforms
      .map((platform) =>
        forRows(
          rows.filter((row) => row.platform === platform),
          platform,
        ),
      )
      .sort((a, b) => b.arrived - a.arrived),
    total: forRows(rows, 'All'),
  };
}

/**
 * Retention, one line per horizon.
 *
 * Each horizon reports the cohorts that *reached* day N inside the digest's
 * window, which is why the query is run over a longer window than the digest's
 * own: a cohort that arrived this week cannot have a D7 yet, and the honest
 * answer to "what is our D7" on any given day is the cohorts that just
 * finished earning one.
 *
 * `null` columns from the query are cohorts that have not matured. They are
 * dropped rather than counted as zero — counting them would report a cohort
 * that has not had time to return as one that chose not to.
 */
function summariseRetention(rows, days) {
  // The last day the export delivered, not the last day anybody arrived on.
  // Taking the newest cohort instead would move every window on a quiet day.
  const lastDay = rows[0]?.data_through ?? null;
  if (!lastDay) return { lastDay: null, horizons: [] };

  const horizons = DIGEST_HORIZONS.map((horizon) => {
    const matured = rows.filter(
      (row) =>
        row[`d${horizon}_users`] !== null &&
        row.cohort_day <= shiftDay(lastDay, -horizon) &&
        row.cohort_day > shiftDay(lastDay, -(horizon + days)),
    );
    const users = sumBy(matured, 'cohort_users');
    const returned = sumBy(matured, `d${horizon}_users`);

    return {
      horizon,
      cohortDays: new Set(matured.map((row) => row.cohort_day)).size,
      users,
      returned,
      pct: pct(returned, users),
      from: matured.length
        ? matured.map((row) => row.cohort_day).sort()[0]
        : null,
      to: matured.length
        ? matured
            .map((row) => row.cohort_day)
            .sort()
            .at(-1)
        : null,
    };
  });

  return { lastDay, horizons };
}

/**
 * Run both queries and reduce them to what the digest prints.
 *
 * The retention window is extended by the longest horizon the digest shows,
 * because the cohorts it reports on arrived before the window the digest
 * describes.
 */
export async function collectCohortHeadlines({ days }) {
  const projectId = tryResolveProjectId();
  if (!projectId) {
    return {
      available: false,
      reason:
        'no BigQuery project resolved (set BIGQUERY_PROJECT_ID, or provide a ' +
        'service-account key).',
    };
  }

  const datasetId = datasetIdFor(resolvePropertyId());
  const retentionDays = days + Math.max(...DIGEST_HORIZONS);

  try {
    const client = await createBigQueryClient();
    const dataset = await getDataset(client, projectId, datasetId, {
      soft: true,
    });
    if (!dataset) {
      return {
        available: false,
        reason:
          `dataset ${projectId}.${datasetId} does not exist yet — check the ` +
          'export with `npm run analytics:bigquery -- --status`.',
      };
    }

    const location = dataset.location ?? resolveDatasetLocation();
    const funnelRows = await runCheckedIn(client, {
      queryId: ACTIVATION_FUNNEL_QUERY,
      days,
      projectId,
      datasetId,
      location,
    });
    const retentionRows = await runCheckedIn(client, {
      queryId: RETENTION_COHORTS_QUERY,
      days: retentionDays,
      projectId,
      datasetId,
      location,
    });

    return {
      available: true,
      days,
      retentionDays,
      funnel: summariseFunnel(funnelRows),
      retention: summariseRetention(retentionRows, days),
    };
  } catch (error) {
    if (error instanceof BigQueryUnavailableError) {
      return { available: false, reason: error.message };
    }
    throw error;
  }
}

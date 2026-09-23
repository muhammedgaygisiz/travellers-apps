-- D1 / D7 / D30 retention by arrival cohort (issue #987).
--
-- The question Phase 4 of epic #907 exists to answer is why users leave, and
-- the first half of it is whether they come back at all. A cohort is the only
-- shape that answers it: the people who arrived on one day, checked on a later
-- one. The GA4 Data API cannot express it - it has no way to intersect the
-- user set of one day with another's - which is what the BigQuery export is
-- for. The horizons are declared in `cohorts.config.mjs`.
--
-- ## Classic retention, not rolling
--
-- A cohort is counted as retained on day N if it was active on *exactly* day
-- N. That is what GA4's own cohort exploration shows, so a number from here
-- can be checked against the console. Rolling retention - active on day N or
-- any day after - answers "did we lose them for good" instead, reads several
-- points higher on the same data, and is a different query rather than a flag
-- on this one.
--
-- ## The maturity guard, which is the point of the query
--
-- A cohort that arrived three days ago has no D7 yet. Counting it would return
-- 0, and 0 is indistinguishable from a cohort that arrived and never came
-- back - the worst possible number to report by accident, because it is
-- alarming and wrong in the same direction. Every horizon is therefore NULL
-- until `cohort_day + N` is a day the window actually covers, and `n/a` is
-- what the digest prints for it.
--
-- The same arithmetic constrains the window: D7 needs the run to reach seven
-- days past the cohort, so `--days=7` can only ever mature its oldest cohort.
-- Run it over `--days=30` or more to read D7 properly, and note that the
-- export itself starts on 31 August 2026 - nothing earlier exists to cohort.
WITH activity AS (
  SELECT
    user_pseudo_id,
    platform,
    event_name,
    event_timestamp,
    PARSE_DATE('%Y%m%d', event_date) AS event_day
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
),
-- The last day the export actually delivered, which is not the last day asked
-- for: GA4 writes a day's table up to 24h late, so a digest running at 06:00
-- finds yesterday missing about as often as not. Judging maturity against the
-- requested @end_date would mark a horizon ripe on a day with no data in it
-- and report the resulting 0 as a retention collapse.
window_bounds AS (
  SELECT MAX(event_day) AS last_day FROM activity
),
-- Membership is the arrival event, not "first seen in these tables". The
-- difference matters at the start of the window, where every long-standing
-- user looks new: `first_open` and `first_visit` are fired once per install,
-- so a cohort built on them holds only people who genuinely arrived.
cohort AS (
  SELECT user_pseudo_id, cohort_day, platform
  FROM (
    SELECT
      user_pseudo_id,
      event_day AS cohort_day,
      platform,
      ROW_NUMBER() OVER (
        PARTITION BY user_pseudo_id ORDER BY event_timestamp
      ) AS seq
    FROM activity
    WHERE event_name IN ('first_open', 'first_visit')
  )
  WHERE seq = 1
),
-- Any event at all counts as a return. A person who opened the app and read
-- one Bite came back, and holding retention to a deliberate action would
-- measure engagement under retention's name.
active_days AS (
  SELECT DISTINCT user_pseudo_id, event_day
  FROM activity
),
per_user AS (
  SELECT
    c.cohort_day,
    c.platform,
    c.user_pseudo_id,
    LOGICAL_OR(a.event_day = DATE_ADD(c.cohort_day, INTERVAL 1 DAY)) AS d1,
    LOGICAL_OR(a.event_day = DATE_ADD(c.cohort_day, INTERVAL 7 DAY)) AS d7,
    LOGICAL_OR(a.event_day = DATE_ADD(c.cohort_day, INTERVAL 30 DAY)) AS d30
  FROM cohort c
  LEFT JOIN active_days a USING (user_pseudo_id)
  GROUP BY cohort_day, platform, user_pseudo_id
)
SELECT
  cohort_day,
  platform,
  -- The day maturity is judged against, carried out with the rows so a reader
  -- can see why a horizon is still blank.
  (SELECT last_day FROM window_bounds) AS data_through,
  COUNT(*) AS cohort_users,
  IF(
    DATE_ADD(cohort_day, INTERVAL 1 DAY) <= (SELECT last_day FROM window_bounds),
    COUNTIF(d1),
    NULL
  ) AS d1_users,
  IF(
    DATE_ADD(cohort_day, INTERVAL 7 DAY) <= (SELECT last_day FROM window_bounds),
    COUNTIF(d7),
    NULL
  ) AS d7_users,
  IF(
    DATE_ADD(cohort_day, INTERVAL 30 DAY) <= (SELECT last_day FROM window_bounds),
    COUNTIF(d30),
    NULL
  ) AS d30_users,
  IF(
    DATE_ADD(cohort_day, INTERVAL 1 DAY) <= (SELECT last_day FROM window_bounds),
    ROUND(100 * SAFE_DIVIDE(COUNTIF(d1), COUNT(*)), 1),
    NULL
  ) AS d1_pct,
  IF(
    DATE_ADD(cohort_day, INTERVAL 7 DAY) <= (SELECT last_day FROM window_bounds),
    ROUND(100 * SAFE_DIVIDE(COUNTIF(d7), COUNT(*)), 1),
    NULL
  ) AS d7_pct,
  IF(
    DATE_ADD(cohort_day, INTERVAL 30 DAY) <= (SELECT last_day FROM window_bounds),
    ROUND(100 * SAFE_DIVIDE(COUNTIF(d30), COUNT(*)), 1),
    NULL
  ) AS d30_pct
FROM per_user
GROUP BY cohort_day, platform
ORDER BY cohort_day DESC, cohort_users DESC

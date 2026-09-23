-- The activation funnel: arrival → onboarding → sign-up → first Bite (issue #987).
--
-- The launch dashboard already counts sign-ups and Bites for a window. This
-- asks the question those totals cannot: of the people who *arrived* in the
-- window, how many got as far as each step. Same events, followed per person
-- rather than summed, which is why it is here and not a Data API tile - a
-- funnel needs one user's later events joined to that user's arrival, and the
-- Data API has no join.
--
-- The steps are declared in `cohorts.config.mjs`; `analytics-events.spec.ts`
-- fails if that list and this query stop agreeing.
--
-- Split by platform because that is where the answer turned out to live: the
-- funnel exists to locate a drop-off, and the first one it found was a
-- surface, not a step.
--
-- ## What one row is
--
-- One arrival day, one platform. `arrived` is people, not events, and every
-- later column is a subset of it: the same person counted once however many
-- Bites they went on to publish.
--
-- ## The two honesty guards
--
-- `days_observed` is how long the cohort has had to convert. The last day in
-- the window has had hours, so its conversion rates are not comparable with a
-- day that has had a week, and reading the trailing row as a decline is the
-- easiest mistake this query can cause. It is a column rather than a filter
-- because a recent cohort is still worth seeing.
--
-- A later step is only counted from the arrival onward (`event_timestamp >=
-- arrived_at`). Without it, a returning user whose app reinstalled would bring
-- their entire history into a cohort they joined yesterday.
WITH funnel_events AS (
  SELECT
    user_pseudo_id,
    platform,
    event_name,
    event_timestamp,
    PARSE_DATE('%Y%m%d', event_date) AS event_day
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN (
      'first_open',
      'first_visit',
      'onboarding_assistant_started',
      'onboarding_assistant_completed',
      'sign_up',
      'bite_created'
    )
),
-- The last day the export actually delivered. GA4 writes a day's table up to
-- 24h late, so the window asked for routinely runs one day ahead of the data
-- and `days_observed` would overstate how long a cohort has been watched.
window_bounds AS (
  SELECT MAX(event_day) AS last_day FROM funnel_events
),
-- The arrival itself, and the platform it happened on. A person who opens the
-- app and later the website belongs to the surface that brought them in.
arrivals AS (
  SELECT user_pseudo_id, cohort_day, platform, arrived_at
  FROM (
    SELECT
      user_pseudo_id,
      event_day AS cohort_day,
      platform,
      event_timestamp AS arrived_at,
      ROW_NUMBER() OVER (
        PARTITION BY user_pseudo_id ORDER BY event_timestamp
      ) AS seq
    FROM funnel_events
    WHERE event_name IN ('first_open', 'first_visit')
  )
  WHERE seq = 1
),
per_user AS (
  SELECT
    a.cohort_day,
    a.platform,
    a.user_pseudo_id,
    LOGICAL_OR(
      e.event_name = 'onboarding_assistant_started'
      AND e.event_timestamp >= a.arrived_at
    ) AS started_onboarding,
    LOGICAL_OR(
      e.event_name = 'onboarding_assistant_completed'
      AND e.event_timestamp >= a.arrived_at
    ) AS completed_onboarding,
    LOGICAL_OR(
      e.event_name = 'sign_up' AND e.event_timestamp >= a.arrived_at
    ) AS signed_up,
    LOGICAL_OR(
      e.event_name = 'bite_created' AND e.event_timestamp >= a.arrived_at
    ) AS published_bite
  FROM arrivals a
  LEFT JOIN funnel_events e USING (user_pseudo_id)
  GROUP BY cohort_day, platform, user_pseudo_id
)
SELECT
  cohort_day,
  platform,
  -- Repeated on every row rather than left implicit: a reader, and the digest,
  -- both need to know which day the export actually reaches before judging the
  -- youngest cohort.
  (SELECT last_day FROM window_bounds) AS data_through,
  DATE_DIFF((SELECT last_day FROM window_bounds), cohort_day, DAY)
    AS days_observed,
  COUNT(*) AS arrived,
  COUNTIF(started_onboarding) AS onboarding_started,
  COUNTIF(completed_onboarding) AS onboarding_completed,
  COUNTIF(signed_up) AS signed_up,
  COUNTIF(published_bite) AS first_bite,
  -- The end-to-end rate, and then the three places it can be lost. A single
  -- percentage says a funnel is bad; these say where.
  ROUND(100 * SAFE_DIVIDE(COUNTIF(signed_up), COUNT(*)), 1)
    AS arrive_to_signup_pct,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(started_onboarding), COUNT(*)), 1)
    AS arrive_to_onboarding_pct,
  ROUND(
    100 * SAFE_DIVIDE(COUNTIF(completed_onboarding), COUNTIF(started_onboarding)),
    1
  ) AS onboarding_completion_pct,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(published_bite), COUNTIF(signed_up)), 1)
    AS signup_to_bite_pct
FROM per_user
GROUP BY cohort_day, platform
ORDER BY cohort_day DESC, arrived DESC

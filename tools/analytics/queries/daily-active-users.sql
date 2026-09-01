-- Daily active users and their platform split.
--
-- `activeUsers` in the Data API is a single aggregated number per window. Here
-- the same figure is a distinct count over the raw event stream, which is what
-- makes retention cohorts and funnels possible later (issue #987): the
-- `user_pseudo_id` set for one day can be intersected with another day's.
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS day,
  platform,
  COUNT(DISTINCT user_pseudo_id) AS active_users
FROM ${EVENTS_TABLE}
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
GROUP BY day, platform
ORDER BY day DESC, active_users DESC

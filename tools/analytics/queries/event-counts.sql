-- Daily event counts and the users behind them, newest day first.
--
-- The raw-data equivalent of the digest's event tiles, and the smoke test that
-- the GA4 → BigQuery export is delivering: if this returns rows, the export
-- works. Unlike the Data API it is not sampled, not quota-limited, and the
-- window can reach as far back as the export goes.
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS day,
  event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM ${EVENTS_TABLE}
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
GROUP BY day, event_name
ORDER BY day DESC, events DESC

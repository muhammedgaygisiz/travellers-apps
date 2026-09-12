-- Table operation measures per restaurant per service day (issue #1098).
--
-- The three derived measures issue #1098 asks for, computed from the raw GA4
-- export rather than from the Data API. That is deliberate: all three are
-- ratios over an event parameter, and two of them need a *distinct count* of
-- one. The Data API has no distinct-count metric and drops any parameter that
-- has not been registered as a custom dimension on the property, whereas the
-- BigQuery export carries every parameter of every event whether GA4 knows it
-- or not. It is also where these belong for a second reason: the launch
-- dashboard is scoped to launch signals on purpose, and how a restaurant works
-- its room during service is not one.
--
-- The measures:
--   turnover_per_table     seatings / tables  - "table turnover per service"
--   tables_used_pct        tables touched / tables - "share of tables ever used"
--   avg_occupancy_minutes  mean open-to-close of a visit - "average occupancy
--                          duration"
--
-- A service is one calendar day here. A restaurant serving past midnight
-- splits across two rows, which is visible rather than hidden: the visit that
-- crosses the boundary is counted on the day it opened, and a visit still open
-- at the end of the window shows up in `visits_unclosed` instead of dragging
-- the average.
--
-- `tables` is the restaurant's own table count, carried on every table event so
-- a ratio needs one event stream rather than a join. MAX rather than MIN, so a
-- table added mid-service widens the denominator instead of narrowing it.
WITH operations AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS service_day,
    event_name,
    event_timestamp,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'restaurant_id'
    ) AS restaurant_id,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'table_id'
    ) AS table_id,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'visit_id'
    ) AS visit_id,
    (
      SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64))
      FROM UNNEST(event_params)
      WHERE key = 'table_count'
    ) AS table_count
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN (
      'table_seated',
      'table_freed',
      'table_reserved',
      'table_cleaning_started',
      'table_disabled',
      'table_visit_opened',
      'table_visit_closed'
    )
),
-- One row per visit, so a duration is a subtraction rather than a window
-- function. `table_visit_opened` and `table_visit_closed` are the only two
-- events carrying a visit id, and a visit has at most one of each.
visits AS (
  SELECT
    restaurant_id,
    visit_id,
    MIN(IF(event_name = 'table_visit_opened', service_day, NULL)) AS service_day,
    MIN(IF(event_name = 'table_visit_opened', event_timestamp, NULL)) AS opened_at,
    MIN(IF(event_name = 'table_visit_closed', event_timestamp, NULL)) AS closed_at
  FROM operations
  WHERE visit_id IS NOT NULL
  GROUP BY restaurant_id, visit_id
),
occupancy AS (
  SELECT
    restaurant_id,
    service_day,
    -- Micros to minutes. NULL closes are ignored by AVG rather than counted as
    -- zero, and named separately below.
    AVG((closed_at - opened_at) / 60000000) AS avg_occupancy_minutes,
    COUNTIF(closed_at IS NULL) AS visits_unclosed
  FROM visits
  WHERE opened_at IS NOT NULL
  GROUP BY restaurant_id, service_day
),
service AS (
  SELECT
    restaurant_id,
    service_day,
    MAX(table_count) AS tables,
    COUNTIF(event_name = 'table_seated') AS seatings,
    COUNT(DISTINCT table_id) AS tables_touched,
    COUNT(DISTINCT IF(event_name = 'table_seated', table_id, NULL))
      AS tables_seated
  FROM operations
  GROUP BY restaurant_id, service_day
)
SELECT
  s.service_day,
  s.restaurant_id,
  s.tables,
  s.seatings,
  s.tables_seated,
  s.tables_touched,
  ROUND(SAFE_DIVIDE(s.seatings, s.tables), 2) AS turnover_per_table,
  ROUND(100 * SAFE_DIVIDE(s.tables_touched, s.tables), 1) AS tables_used_pct,
  ROUND(o.avg_occupancy_minutes, 1) AS avg_occupancy_minutes,
  IFNULL(o.visits_unclosed, 0) AS visits_unclosed
FROM service AS s
LEFT JOIN occupancy AS o
  ON o.restaurant_id = s.restaurant_id
  AND o.service_day = s.service_day
ORDER BY s.service_day DESC, s.seatings DESC

-- The order-to-Bite conversion funnel, per restaurant (issue #1114).
--
-- Stage 4 of epic #1073 exists to answer one question: does the table platform
-- actually feed the core product. This is that question as a number - how many
-- of the people who scanned a code ended up publishing a Bite about what they
-- ate, and where in the seven steps between the two they stopped.
--
-- Over the BigQuery export rather than the GA4 Data API, for the reason
-- `table-operations.sql` is: two of the steps are a distinct count of
-- `visit_id`, the Data API has no distinct-count metric, and the parameters
-- this reads - `restaurant_id`, `visit_id`, `has_account` - are either
-- deliberately unregistered as custom dimensions or too recent to be
-- backfilled. The export carries every parameter of every event regardless.
--
-- The steps, in order, and what each one is:
--   scans              every `table_code_scanned`, however it ended
--   scans_resolved     the ones that reached a restaurant's menu or table
--   sessions           `table_session_started`
--   orders             `table_order_submitted`, replays already excluded
--   visits_closed      distinct visits staff cleared - the business app's event
--   bites_offered      distinct visits whose summary reached a guest
--   bites_started      drafts opened from that offer
--   bites_published    `bite_created` with `source = visit`
--
-- Two joins to know about.
--
-- `table_visit_closed` is emitted by the **business** app and carries no
-- `has_account`, because a staff tablet has no idea who was at the table. So
-- the split by account is applied to the guest-side steps only, and the closed
-- count is whole. That is honest rather than convenient: the denominator of
-- "did the meal become a Bite" is meals, and a meal is a thing the restaurant
-- ended.
--
-- A refused scan names no restaurant at all, so it can be counted in `scans`
-- and nowhere else. `scans_resolved` is the number every later step should
-- actually be read against per restaurant, and both are reported rather than
-- one silently standing in for the other.
WITH funnel AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS service_day,
    event_name,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'restaurant_id'
    ) AS restaurant_id,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'visit_id'
    ) AS visit_id,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'outcome'
    ) AS outcome,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'source'
    ) AS source,
    (
      -- Booleans arrive as `int_value` 0/1 through the native bridge and as
      -- `string_value` from the web SDK, so both are read and normalised.
      SELECT COALESCE(
        CAST(value.int_value AS BOOL),
        LOWER(value.string_value) = 'true'
      )
      FROM UNNEST(event_params)
      WHERE key = 'has_account'
    ) AS has_account
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN (
      'table_code_scanned',
      'table_session_started',
      'table_order_submitted',
      'table_visit_closed',
      'table_bite_prompt_shown',
      'table_bite_started',
      'bite_created'
    )
),
steps AS (
  SELECT
    service_day,
    restaurant_id,
    COUNTIF(event_name = 'table_code_scanned') AS scans,
    COUNTIF(
      event_name = 'table_code_scanned'
      AND outcome IN ('confirm', 'menu_only')
    ) AS scans_resolved,
    COUNTIF(event_name = 'table_session_started') AS sessions,
    COUNTIF(event_name = 'table_order_submitted') AS orders,
    COUNT(DISTINCT IF(event_name = 'table_visit_closed', visit_id, NULL))
      AS visits_closed,
    COUNT(DISTINCT IF(event_name = 'table_bite_prompt_shown', visit_id, NULL))
      AS bites_offered,
    COUNTIF(event_name = 'table_bite_started') AS bites_started,
    -- The only step that reads a parameter to decide what it is counting: a
    -- Bite somebody typed by hand is a Bite, and is not this funnel's.
    COUNTIF(event_name = 'bite_created' AND source = 'visit')
      AS bites_published,
    -- Guests BiteTribe did not already have, at the top of the funnel. The
    -- numerator of "did the offer bring anybody in" is a `sign_up` in the same
    -- session, which is a GA4 exploration rather than a column here - what this
    -- carries is the population that could have converted.
    COUNTIF(event_name = 'table_session_started' AND NOT has_account)
      AS sessions_without_account,
    COUNTIF(event_name = 'table_bite_prompt_shown' AND NOT has_account)
      AS prompts_without_account
  FROM funnel
  GROUP BY service_day, restaurant_id
)
SELECT
  service_day,
  restaurant_id,
  scans,
  scans_resolved,
  sessions,
  orders,
  visits_closed,
  bites_offered,
  bites_started,
  bites_published,
  sessions_without_account,
  prompts_without_account,
  -- The rate the issue asks for, end to end: of the orders that reached a
  -- kitchen, how many became a Bite somebody published.
  ROUND(100 * SAFE_DIVIDE(bites_published, orders), 1) AS order_to_bite_pct,
  -- And the two halves of it, so a drop can be located rather than only seen.
  ROUND(100 * SAFE_DIVIDE(orders, scans_resolved), 1) AS scan_to_order_pct,
  ROUND(100 * SAFE_DIVIDE(bites_published, bites_offered), 1)
    AS offer_to_bite_pct
FROM steps
ORDER BY service_day DESC, orders DESC

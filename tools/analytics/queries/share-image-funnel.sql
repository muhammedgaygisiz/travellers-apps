-- The share-as-image funnel, per day (issue #1733, UC-SBS R-29).
--
-- Epic #1723 lets a user turn one of their own Bites into an image for an
-- Instagram or Facebook Story or Post. This is whether they do, and where the
-- ones who start stop: menu, entry, composer, layout, hand-off.
--
-- Over the BigQuery export rather than the GA4 Data API, because
-- `bites_shared` is a distinct count of `bite_id`: the Data API has no
-- distinct-count metric, and `bite_id` is deliberately not registered as a
-- custom dimension. The export carries every parameter regardless.
--
-- The steps, and what each one is:
--   menus_opened         `share_menu_opened`, on the viewer's own Bites only
--   targets_chosen       `share_target_chosen`, every entry including `more`
--   link_shares          the `more` entries: the link share, outside this funnel
--   composers_opened     `share_composer_opened`, split into Story and Post
--   layouts_picked       `share_template_chosen`; none, one or several per image
--   handoffs_succeeded   `share_handoff_succeeded`, split into saved and shared
--   handoffs_cancelled   `share_handoff_failed` with `reason = cancelled`
--   handoffs_failed      every other `share_handoff_failed`
--
-- "Succeeded" is the image leaving BiteTribe - saved, or taken by an app from
-- the share sheet. Instagram and Facebook do not report whether the user then
-- posted it, so nothing here can count a post.
WITH funnel AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS share_day,
    event_name,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'bite_id'
    ) AS bite_id,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'target'
    ) AS target,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'format'
    ) AS format,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'action'
    ) AS action,
    (
      SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'reason'
    ) AS reason
  FROM ${EVENTS_TABLE}
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
    AND event_name IN (
      'share_menu_opened',
      'share_target_chosen',
      'share_composer_opened',
      'share_template_chosen',
      'share_handoff_succeeded',
      'share_handoff_failed'
    )
),
steps AS (
  SELECT
    share_day,
    COUNTIF(event_name = 'share_menu_opened') AS menus_opened,
    COUNTIF(event_name = 'share_target_chosen') AS targets_chosen,
    COUNTIF(event_name = 'share_target_chosen' AND target = 'more')
      AS link_shares,
    COUNTIF(event_name = 'share_composer_opened') AS composers_opened,
    COUNTIF(event_name = 'share_composer_opened' AND format = 'story')
      AS story_composers,
    COUNTIF(event_name = 'share_composer_opened' AND format = 'post')
      AS post_composers,
    COUNTIF(event_name = 'share_template_chosen') AS layouts_picked,
    COUNTIF(event_name = 'share_handoff_succeeded') AS handoffs_succeeded,
    COUNTIF(event_name = 'share_handoff_succeeded' AND action = 'save')
      AS images_saved,
    COUNTIF(event_name = 'share_handoff_succeeded' AND action = 'share')
      AS images_shared,
    -- Closing the share sheet is a user changing their mind, not a fault, so
    -- it is its own column rather than part of the failures.
    COUNTIF(event_name = 'share_handoff_failed' AND reason = 'cancelled')
      AS handoffs_cancelled,
    COUNTIF(event_name = 'share_handoff_failed' AND reason != 'cancelled')
      AS handoffs_failed,
    COUNT(DISTINCT IF(event_name = 'share_handoff_succeeded', bite_id, NULL))
      AS bites_shared
  FROM funnel
  GROUP BY share_day
)
SELECT
  share_day,
  menus_opened,
  targets_chosen,
  link_shares,
  composers_opened,
  story_composers,
  post_composers,
  layouts_picked,
  handoffs_succeeded,
  images_saved,
  images_shared,
  handoffs_cancelled,
  handoffs_failed,
  bites_shared,
  -- End to end: of the menus opened, how many sent an image on its way.
  ROUND(100 * SAFE_DIVIDE(handoffs_succeeded, menus_opened), 1)
    AS menu_to_handoff_pct,
  -- And the two halves of it, so a drop can be located rather than only seen.
  ROUND(100 * SAFE_DIVIDE(composers_opened, menus_opened), 1)
    AS menu_to_composer_pct,
  ROUND(100 * SAFE_DIVIDE(handoffs_succeeded, composers_opened), 1)
    AS composer_to_handoff_pct
FROM steps
ORDER BY share_day DESC

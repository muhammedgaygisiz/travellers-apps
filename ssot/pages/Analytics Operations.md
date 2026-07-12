# Analytics Operations

## Purpose

How BiteTribe operates analytics after launch: how metrics are checked, how the
daily monitoring loop runs, and the roadmap for deeper analysis. Part of
[[epic-907]] (Launch Readiness), Phase 2–4.

## Operating Principle

Keep analytics **as code** so any agent (Codex, Claude) can operate it, and
avoid console-only knowledge that lives in one person's head. Every metric,
threshold, and (eventually) query is defined in the repo and reproducible.

## What Exists (Tier 1)

Tooling lives in `tools/analytics/` (setup: `tools/analytics/README.md`):

- **Snapshot** — `npm run analytics:report` queries the launch metrics via the
  GA4 Data API.
- **Daily digest** — `npm run analytics:digest` compares the current window to
  the previous one, shows deltas, and raises threshold alerts defined per tile
  in `dashboard.config.mjs`.
- **Automation** — `.github/workflows/analytics-digest.yml` runs the digest
  daily and posts it to a **"Daily analytics digest"** GitHub issue (secret
  `GA4_SA_KEY`, variable `GA4_PROPERTY_ID`).
- **Config-as-code** — `npm run analytics:provision` registers GA4 key events
  and custom dimensions from the taxonomy (needs Editor on the property).

Dashboard-as-code and the event taxonomy are documented in
[[Implementation - Analytics Events]].

## Limits

- GA4 has no API to create visual dashboards/explorations — the config + report
  is the reproducible substitute.
- The Data API is aggregated and quota-limited; retention cohorts and raw event
  joins need BigQuery.
- Retention (D1/D7) and crash-free users remain console/Crashlytics tiles until
  BigQuery lands.

## Roadmap (Tier 2–3)

| Item                                     | Issue         | Tier |
| ---------------------------------------- | ------------- | ---- |
| BigQuery export as analytics foundation  | [[issue-986]] | 2    |
| Activation funnel + retention cohorts    | [[issue-987]] | 2    |
| Unified growth + stability daily digest  | [[issue-988]] | 2    |
| GDPR consent mode + PII/retention review | [[issue-989]] | 3    |

Sequencing: BigQuery export ([[issue-986]]) unblocks funnels/cohorts
([[issue-987]]); consent/PII ([[issue-989]]) is launch-sensitive for EU and
should not slip.

## Related Pages

- [[Implementation - Analytics Events]]
- [[Architecture - Analytics]]
- [[epic-907]]
- [[Current State - Roadmap]]

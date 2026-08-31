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
  in `dashboard.config.mjs`. It carries **growth and stability in one artifact**:
  crash-free users, unhandled errors, and the top unhandled errors by message
  sit alongside the activation, creation and discovery tiles.
- **Automation** — `.github/workflows/analytics-digest.yml` runs the digest
  daily and posts it to a **"Daily analytics digest"** GitHub issue (secret
  `GA4_SA_KEY`, variable `GA4_PROPERTY_ID`).
- **Config-as-code** — `npm run analytics:provision` registers GA4 key events
  and custom dimensions from the taxonomy (needs Editor on the property).

Dashboard-as-code and the event taxonomy are documented in
[[Implementation - Analytics Events]].

## Stability Signal

Crashlytics has no read API, so the daily stability numbers come from GA4
instead, using the events Crashlytics and the app already emit:

- **Crash-free users** is derived, not read: all active users in the window
  against the subset who triggered `app_exception`, the event Crashlytics logs
  itself when a native process crashes. Over zero active users the digest
  reports `n/a` rather than 100%, because "nobody used the app" is not a clean
  bill of health. Threshold: alert below 99%.
- **Unhandled errors** counts `exception`, which
  `FirebaseErrorHandlerService` logs for every unhandled Angular error on all
  three platforms. These are usually survivable, so they are kept out of the
  crash-free rate; folding them in would understate it against the Crashlytics
  console. Threshold: alert on a rise over 100% against the previous window.
- **Top unhandled errors** groups the same event by its `description`
  parameter, which `provision-ga4.mjs` registers as a custom dimension.
  **Registered on 31 August 2026** along with `fatal`, so the breakdown names
  errors from that date forward. GA4 does not backfill a dimension: the 128
  `exception` events already collected in the preceding 30 days all report as
  `(not set)`, and that is expected rather than a defect. Where the dimension
  is missing entirely the digest prints a pointer to the provisioning command
  rather than failing the daily run.

  Registration changed nothing about what is collected. `description` was
  already being transmitted on every error; it was only unqueryable. That also
  means any PII inside an error message was already reaching GA4, which is
  evidence for [[issue-989]] rather than something this introduced.

What stays in the console is what only exists there: **stack traces and
non-fatal `recordException` reports**, in Crashlytics → Issues. GA4 says how
many and which message; Crashlytics says where in the code.

A crash-free rate pinned at exactly 100% is worth one console cross-check
before it is trusted, because an `app_exception` pipeline that never fires and
an app that never crashes look identical from the Data API.

## Limits

- GA4 has no API to create visual dashboards/explorations — the config + report
  is the reproducible substitute.
- The Data API is aggregated and quota-limited; retention cohorts and raw event
  joins need BigQuery.
- Retention (D1/D7) remains a console tile until BigQuery lands.

## Roadmap (Tier 2–3)

| Item                                     | Issue         | Tier |
| ---------------------------------------- | ------------- | ---- |
| BigQuery export as analytics foundation  | [[issue-986]] | 2    |
| Activation funnel + retention cohorts    | [[issue-987]] | 2    |
| Unified growth + stability daily digest  | [[issue-988]] | 2    |
| GDPR consent mode + PII/retention review | [[issue-989]] | 3    |

[[issue-988]] is **done**, landed with the soft-launch monitoring loop under
[[issue-912]]: the digest is one artifact answering both "are we growing?" and
"are we breaking?", and crash-free users carries a threshold. See Stability
Signal above.

Sequencing: BigQuery export ([[issue-986]]) unblocks funnels/cohorts
([[issue-987]]); consent/PII ([[issue-989]]) is launch-sensitive for EU and
should not slip.

## Related Pages

- [[Implementation - Analytics Events]]
- [[Architecture - Analytics]]
- [[epic-907]]
- [[Current State - Roadmap]]

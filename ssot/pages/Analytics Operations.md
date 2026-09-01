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

- **Raw event data** — `npm run analytics:bigquery` owns the GA4 → BigQuery
  export link as config-as-code, and `npm run analytics:query` runs the SQL
  checked in under `tools/analytics/queries/`. See BigQuery Export below.

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

## BigQuery Export (Tier 2)

The Data API is aggregated, sampled and quota-limited, and cannot express a
retention cohort or a funnel at all. The GA4 → BigQuery export writes the raw
event stream into `analytics_<propertyId>`, where SQL can do both and join
against Firestore data. This is the foundation [[issue-987]] builds on.

The link is config-as-code in `tools/analytics/provision-bigquery.mjs`, so the
export is a reviewable decision rather than a click someone once made in the
console. Each default is deliberate:

- **Daily export, not streaming.** Streaming is billed per GB ingested;
  cohorts and funnels read the daily tables. `--streaming` enables it when a
  same-day question actually needs it.
- **Dataset location `EU`.** GA4 fixes this at link creation and cannot move
  the dataset afterwards. The EU multi-region matches the user base and keeps
  the raw event data — the data [[issue-989]] has to reason about — in the EU.
- **No advertising id.** BiteTribe runs no ad attribution, so exporting
  IDFA/AAID would widen the PII surface for no analytical gain.
- **All data streams.** `exportStreams` is left unset, so the web, iOS and
  Android streams are all exported and a fourth needs no code change.

Checked-in SQL lives in `tools/analytics/queries/`, run by
`npm run analytics:query -- <id>`. Two placeholders keep a query portable:
`${EVENTS_TABLE}` for the wildcard table, and `@start_date`/`@end_date` for the
`_TABLE_SUFFIX` window.

The export has **no backfill**: it starts from the day the link is enabled, and
the first daily table lands up to 24 hours later. Everything before that day
stays Data-API-only, the same way the `description` dimension did.

### Access tiers

Reporting needed Viewer on the GA4 property and no Cloud IAM at all. BigQuery
needs more, in two places that are easy to confuse:

| Action                              | Needs                                                       |
| ----------------------------------- | ----------------------------------------------------------- |
| `analytics:bigquery` (plan, status) | Viewer on the GA4 property                                  |
| `analytics:bigquery -- --apply`     | **Administrator** on the property + dataset-create in Cloud |
| `analytics:query`                   | `roles/bigquery.jobUser` + `roles/bigquery.dataViewer`      |

Editor — the tier [[issue-912]] raised the account to for
`analytics:provision` — is **not** enough to create a link. With Editor every
read succeeds and only the create is denied, which reads like a broken script
rather than a missing grant. Linking from the GA4 console is the equivalent
path and additionally grants the Analytics service agent its BigQuery
permissions implicitly.

## Limits

- GA4 has no API to create visual dashboards/explorations — the config + report
  is the reproducible substitute.
- The Data API is aggregated and quota-limited; retention cohorts and raw event
  joins need BigQuery.
- Retention (D1/D7) remains a console tile until the BigQuery export has
  delivered enough days to compute a cohort from.

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

[[issue-986]] shipped the tooling, the checked-in SQL and this documentation,
and the export was **enabled on 1 September 2026** — link
`properties/487035057/bigQueryLinks/XHhCGXsiSYmA_SFBzZpf9g`, daily into
`bite-tribe.analytics_487035057` (EU), all three streams, no advertising id.
It was created through the GA4 console rather than `--apply`, because the
service account is Editor on the property and creating a link needs
Administrator; the console path grants the Analytics service agent its
BigQuery permissions as a side effect. `--status` reads the result either way.

`roles/bigquery.jobUser` + `roles/bigquery.dataViewer` were granted to
`analytics-reporter@bite-tribe.iam.gserviceaccount.com` the same day, verified
by a query job succeeding in the EU location where it previously returned
`Access Denied: bigquery.jobs.create`. The only thing still gating a query is
the first daily table, which GA4 delivers up to 24h after linking.

## Related Pages

- [[Implementation - Analytics Events]]
- [[Architecture - Analytics]]
- [[epic-907]]
- [[Current State - Roadmap]]

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
  evidence for [issue 989](https://github.com/muhammedgaygisiz/travellers-apps/issues/989) rather than something this introduced.

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
against Firestore data. This is the foundation [issue 987](https://github.com/muhammedgaygisiz/travellers-apps/issues/987) builds on.

The link is config-as-code in `tools/analytics/provision-bigquery.mjs`, so the
export is a reviewable decision rather than a click someone once made in the
console. Each default is deliberate:

- **Daily export, not streaming.** Streaming is billed per GB ingested;
  cohorts and funnels read the daily tables. `--streaming` enables it when a
  same-day question actually needs it.
- **Dataset location `EU`.** GA4 fixes this at link creation and cannot move
  the dataset afterwards. The EU multi-region matches the user base and keeps
  the raw event data — the data [issue 989](https://github.com/muhammedgaygisiz/travellers-apps/issues/989) has to reason about — in the EU.
- **No advertising id.** BiteTribe runs no ad attribution, so exporting
  IDFA/AAID would widen the PII surface for no analytical gain.
- **All data streams.** `exportStreams` is left unset, so the web, iOS and
  Android streams are all exported and a fourth needs no code change.

Checked-in SQL lives in `tools/analytics/queries/`, run by
`npm run analytics:query -- <id>`. Two placeholders keep a query portable:
`${EVENTS_TABLE}` for the wildcard table, and `@start_date`/`@end_date` for the
`_TABLE_SUFFIX` window.

History effectively starts at the link. The first delivery reached back one
day — the link created on 1 September 2026 at 03:10 CEST produced
`events_20260831` inside 20 hours — but that single prior day is an observation
rather than a documented backfill window, and it is all there is. Everything
earlier in the soft launch stays Data-API-only, the same way the `description`
dimension did, so cohort work under [issue 987](https://github.com/muhammedgaygisiz/travellers-apps/issues/987) accumulates forward from
31 August 2026 rather than reading the launch retroactively.

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

## Consent, Retention And PII (Tier 3)

Collection is gated on an explicit decision as of [[issue-989]]. The
implementing pieces are `AnalyticsConsentService` in
`libs/common/ta-firestore/src/lib/analytics/`, the first-run
`AnalyticsConsentGateComponent`, and a Privacy section on the settings page.

### The undecided state is the point

Consent is a tri-state - `unset`, `granted`, `denied` - not a boolean. `unset`
is the window between first launch and the answer, and collection is **off**
during it. A boolean would make "has not been asked" indistinguishable from
"said no", and the gate could never tell whether it still owed a question.

The decision is device-scoped in Capacitor `Preferences`, not user-scoped like
[[issue-1016]]'s coach marks, because it must be readable before the first
analytics call and that happens long before anyone signs in.

`AnalyticsConsentService.initialize()` runs **first** in the startup
initializer, ahead of App Check. App Check logs its own
`app_check_startup_started` / `_completed` telemetry, so a later gate would leak
two events per launch, every launch.

This replaces the unconditional `setEnabled({ enabled: true })` that used to sit
in `provideFirestoreUtils`. The [[issue-1387]] property it carried is preserved:
production still _states_ the flag on every startup rather than trusting a
native default that outlives installs - it now states the user's answer.

Analytics and crash reporting are stored as two answers. Product analytics is
optional by any reading; crash reporting is what makes a broken release
diagnosable, and one switch would mean a user declining analytics also silently
removes the ability to see the app crashing for them. The first-run gate sets
both together; the settings page is where they come apart.

### Retention

| Store           | Setting                                                                  | Decision                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GA4 property    | `eventDataRetention: TWO_MONTHS`                                         | **Keep at the two-month minimum.** It is the privacy-forward end of the range, and since the BigQuery export landed the console no longer has to be the place long-window analysis happens. |
| GA4 property    | `userDataRetention: FOURTEEN_MONTHS`, `resetUserDataOnNewActivity: true` | Unchanged.                                                                                                                                                                                  |
| BigQuery export | **no table expiration**                                                  | **Set a 14-month default table expiration.** Long enough for the cohort work in [[issue-987]], bounded so the raw per-user event stream does not accumulate forever by default.             |

GA4's retention setting does **not** apply to BigQuery. Before this decision the
two disagreed completely: GA4 forgot raw events after 60 days while the export
kept them indefinitely, and neither value had a reason behind it.

The BigQuery expiration is **not yet applied** - the analytics service account
holds `dataViewer` and `jobUser`, neither of which can update a dataset. It
needs an account with `bigquery.datasets.update`:

```bash
bq update --default_table_expiration 36288000 bite-tribe:analytics_487035057
```

Pre-consent data is a separate question this decision does not settle: events
collected before the gate shipped are still in the export, and a strict reading
says those partitions should go.

### PII stance

The event taxonomy came out of review clean. Every parameter is a closed set -
`method`, `surface`, `reason`, `step`, `rating`, `verified` - and
`search_performed` deliberately carries no query text, which is the usual leak.

The exception was `exception`. Its `description` is whatever a thrown error
happened to say, which routinely means an address, a uid, or a URL carrying a
token, and [[issue-986]] put it in a store with no expiry. It is now passed
through `redactErrorDescription` before it leaves the device: emails, JWTs,
query strings and long mixed-case-and-digit ids are replaced, and the result is
truncated. The rules are blunt on purpose - a redactor that reasons about what
is _really_ identifying will let something through.

Crashlytics keeps the full message and stack. That is its function, it is behind
its own consent answer, and redacting a stack would leave a crash report that
cannot be acted on. GA4 says how many and roughly what; Crashlytics says where.

`setUserId` is gated the same way, and clears rather than skips: a user who
withdraws needs the uid already sent from that device removed, not left to go
stale.

## Limits

- GA4 has no API to create visual dashboards/explorations — the config + report
  is the reproducible substitute.
- The Data API is aggregated and quota-limited; retention cohorts and raw event
  joins need BigQuery.
- Retention (D1/D7) remains a console tile until the BigQuery export has
  delivered enough days to compute a cohort from.

## Roadmap (Tier 2–3)

| Item                                     | Issue                                                                       | Tier |
| ---------------------------------------- | --------------------------------------------------------------------------- | ---- |
| BigQuery export as analytics foundation  | [issue 986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986) | 2    |
| Activation funnel + retention cohorts    | [issue 987](https://github.com/muhammedgaygisiz/travellers-apps/issues/987) | 2    |
| Unified growth + stability daily digest  | [issue 988](https://github.com/muhammedgaygisiz/travellers-apps/issues/988) | 2    |
| GDPR consent mode + PII/retention review | [issue 989](https://github.com/muhammedgaygisiz/travellers-apps/issues/989) | 3    |

[issue 988](https://github.com/muhammedgaygisiz/travellers-apps/issues/988) is **done**, landed with the soft-launch monitoring loop under
[[issue-912]]: the digest is one artifact answering both "are we growing?" and
"are we breaking?", and crash-free users carries a threshold. See Stability
Signal above.

Sequencing: BigQuery export ([issue 986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986)) unblocks funnels/cohorts
([issue 987](https://github.com/muhammedgaygisiz/travellers-apps/issues/987)); consent/PII ([issue 989](https://github.com/muhammedgaygisiz/travellers-apps/issues/989)) is launch-sensitive for EU and
should not slip.

[issue 986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986) shipped the tooling, the checked-in SQL and this documentation,
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
`Access Denied: bigquery.jobs.create`.

The export was confirmed **delivering on 1 September 2026**: `events_20260831`
returned 89 `screen_view`, 71 `user_engagement` and 16 `session_start` events
over 9–13 users for 18 KB scanned, which is the `event-counts` query doing
exactly what it exists to do. All three acceptance criteria on [issue 986](https://github.com/muhammedgaygisiz/travellers-apps/issues/986)
are met.

## Related Pages

- [[Implementation - Analytics Events]]
- [[Architecture - Analytics]]
- [[epic-907]]
- [[Current State - Roadmap]]

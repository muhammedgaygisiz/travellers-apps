# Analytics

How to check product analytics and reason about the launch metrics from the
repo. Source of truth: `ssot/pages/Implementation - Analytics Events.md`.

## Event taxonomy

Launch-critical product events are a typed taxonomy in
`libs/common/ta-firestore/src/lib/analytics/analytics-events.ts`, emitted through
`AnalyticsService` (`.../analytics/analytics.service.ts`) from the **integration
layer** that owns the behavior. Tracking never throws and no-ops in the business
app. When adding an event: add it to the taxonomy, emit it from the owning
service/container (not a presentational component), and update the SSOT page
above plus `tools/analytics/dashboard.config.mjs` if it belongs on the dashboard.

## Checking metrics

- Dashboard-as-code: `tools/analytics/dashboard.config.mjs`.
- Snapshot: `npm run analytics:report` (flags `--days=<n>`, `--json`,
  `--dry-run`).
- Daily digest with deltas + threshold alerts: `npm run analytics:digest`
  (same flags). Runs daily in CI via `.github/workflows/analytics-digest.yml`,
  posted to the "Daily analytics digest" GitHub issue.
- Config-as-code: `npm run analytics:provision` (dry-run) /
  `-- --apply` registers GA4 key events + custom dimensions (needs Editor).
- Any `-- --dry-run` and the provision plan need **no credentials** — always
  safe to run.
- A live run needs `GA4_PROPERTY_ID` and `GOOGLE_APPLICATION_CREDENTIALS`
  (service-account key with Viewer on the GA4 property). If they are unset the
  CLI prints a setup pointer instead of failing obscurely. Do not invent or
  commit credentials; direct the user to `tools/analytics/README.md`.

## Limits to state honestly

- GA4 has no public API to create dashboards/explorations; the config + report
  is the reproducible substitute.
- Retention (D1/D7) and crash-free users are console-only tiles (GA4 cohort
  exploration / Crashlytics); the report lists them as manual pointers.
- Provisioning custom dimensions / key events via the Analytics Admin API is a
  documented follow-up (needs Editor access), not yet implemented.

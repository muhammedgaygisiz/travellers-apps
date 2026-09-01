# Analytics tooling

Agent-operable access to the launch analytics defined in
[`ssot/pages/Implementation - Analytics Events.md`](../../ssot/pages/Implementation%20-%20Analytics%20Events.md).

- **`dashboard.config.mjs`** — dashboard-as-code: the launch monitoring tiles
  (one source of truth for the report and the docs).
- **`report.mjs`** — queries the tiles against the GA4 Data API and prints the
  metrics. Run it via `npm run analytics:report`.
- **`provision-bigquery.mjs`** — owns the GA4 → BigQuery export link as
  config-as-code. Run it via `npm run analytics:bigquery`.
- **`queries/*.sql`** — checked-in SQL against the export, run by `query.mjs`
  via `npm run analytics:query`.

## Quick start

```bash
# No credentials needed — prints the planned GA4 queries:
npm run analytics:report -- --dry-run

# Live run (after the one-time setup below):
npm run analytics:report              # last 7 days, table
npm run analytics:report -- --days=30 --json
```

Flags: `--days=<n>` (default 7), `--json`, `--dry-run`, `--help`.

## One-time setup

You need a **GA4 property id** and a **service account** that may read it.

1. **Find the GA4 property id.** Firebase Analytics reports into a linked GA4
   property. In the Google Analytics console: _Admin → Property settings →
   Property ID_ (a number like `123456789`). This is `GA4_PROPERTY_ID`.

2. **Create a service account.** Google Cloud console → _IAM & Admin → Service
   Accounts → Create_ (in the project that backs the Firebase app). No project
   IAM roles are required for read-only reporting.

3. **Grant it access to the GA4 property.** This is the step people miss: access
   is granted **on the GA4 property**, not via Cloud IAM. Google Analytics →
   _Admin → Property Access Management → +_ → add the service account's email
   (`...@...iam.gserviceaccount.com`) with the **Viewer** role. (Add **Editor**
   only if you later provision config via the Admin API — see below.)

4. **Enable the API.** In the Cloud project, enable the
   _Google Analytics Data API_ (`analyticsdata.googleapis.com`).

5. **Download a key and point the tooling at it.** Create a JSON key for the
   service account. Store it **outside the repo** (or as `service-account*.json`,
   which is git-ignored). Then set the two env vars — copy `.env.example` to
   `tools/analytics/.env` (git-ignored) or export them:

   ```bash
   export GA4_PROPERTY_ID=123456789
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
   ```

   > `.env` is not auto-loaded. Export the vars in your shell/CI, or prefix the
   > command: `env $(grep -v '^#' tools/analytics/.env | xargs) npm run analytics:report`.

6. **Run it.** `npm run analytics:report`.

## Daily digest (automated)

`digest.mjs` compares the current window against the previous one, shows deltas,
and raises threshold alerts defined per tile in `dashboard.config.mjs`
(`expect: { min, maxDropPct, maxRisePct }` — `maxRisePct` is for tiles where up
is the bad direction, such as the error count).

```bash
npm run analytics:digest              # Markdown, last 7 days vs previous 7
npm run analytics:digest -- --json    # machine-readable
npm run analytics:digest -- --dry-run # windows + thresholds, no API call
```

The **Analytics digest** GitHub Action
(`.github/workflows/analytics-digest.yml`) runs this daily and posts the result
as a comment on a tracking issue titled **"Daily analytics digest"** (created
automatically on first run). To enable it, add in the repo settings:

- **Secret `GA4_SA_KEY`** — the full contents of the service-account JSON key.
- **Variable `GA4_PROPERTY_ID`** — `487035057`.

Trigger it manually any time from the Actions tab ("Run workflow").

## What it reports

Event-count and active-user tiles are queried live, and so is the stability set:

- **Crash-free users** — GA4 has no crash-free metric, so it is derived from two
  `activeUsers` calls: everyone in the window, and the subset who triggered
  `app_exception`, which is the event Crashlytics itself logs on a native crash.
  Over zero active users it reports `n/a` rather than a flattering 100%.
- **Unhandled errors** — the count of `exception`, logged by
  `FirebaseErrorHandlerService` for every unhandled Angular error on all three
  platforms. Kept out of the crash-free rate because these are usually
  survivable; folding them in would understate the rate against the console.
- **Top unhandled errors** — the same event grouped by its `description`
  parameter. This needs the `description` custom dimension (see below); until it
  is registered the digest prints a pointer to that command instead of failing,
  and because GA4 does not backfill a dimension, the breakdown fills from the
  day it is registered rather than retroactively.

Two tiles stay console-only because the Data API cannot express them at all:

- **D1 / D7 retention** — GA4 → Retention / cohort exploration.
- **Crash stack traces and non-fatals** — Firebase Crashlytics → Issues. Counts
  come from GA4; traces and `recordException` reports exist only in Crashlytics.

## BigQuery export (raw event data)

The Data API is aggregated, sampled and quota-limited, and it cannot express a
retention cohort or a funnel at all. The **GA4 → BigQuery export** writes the
raw event stream into `analytics_<propertyId>`, where SQL can do those things
and join against Firestore data. It is the foundation for
[issue #987](https://github.com/muhammedgaygisiz/travellers-apps/issues/987).

`provision-bigquery.mjs` owns the export link, so it is reproducible rather
than a click someone once made in the console.

```bash
npm run analytics:bigquery                 # print the planned link (no creds needed)
npm run analytics:bigquery -- --status     # current link, dataset, delivered tables
npm run analytics:bigquery -- --apply      # create the link (idempotent)
```

Defaults, each deliberate:

- **Daily export only.** Streaming (`--streaming`) is billed per GB ingested and
  produces `events_intraday_*`; cohorts and funnels read the daily tables.
- **Dataset location `EU`** (`--location=`, `BIGQUERY_DATASET_LOCATION`). GA4
  fixes this at link creation and cannot move the dataset afterwards, so it is
  chosen for the EU user base and for the PII questions in issue #989.
- **No advertising id.** BiteTribe runs no ad attribution, so exporting
  IDFA/AAID would only widen the PII surface.
- **All data streams.** `exportStreams` is left unset, so a stream added later
  is exported without editing the script.

The first daily table arrives **up to 24 hours** after the link is enabled, and
GA4 does not backfill: the export starts from the day it is turned on.

### One-time access, and who can do what

`--status` and `--dry-run` need only the **Viewer** the reporting tooling
already has. Creating the link and querying the export each need a grant beyond
that, and neither can be self-granted by the service account.

**To create the link** — one of:

- **Raise the service account to Administrator** on the GA4 property (Analytics
  → Admin → Property Access Management), then `npm run analytics:bigquery --
--apply`. **Editor is not enough**: with Editor every read in this script
  succeeds and only the create is denied, which looks like a broken script
  rather than a missing grant. The account also needs permission to create the
  dataset in the target Cloud project (`roles/bigquery.admin`, or
  `bigquery.datasets.create`).
- **Or link it in the console** — GA4 → Admin → Product links → BigQuery links →
  _Link_. Pick the `bite-tribe` project, **daily** frequency, dataset location
  **EU**, advertising id **off**. This is the same link the script would create,
  and console linking grants the Analytics service agent its BigQuery
  permissions implicitly. Confirm afterwards with
  `npm run analytics:bigquery -- --status`.

**In the Cloud project**, whichever path is used:

1. **Billing enabled**, and the **BigQuery API** on (`bigquery.googleapis.com`).
2. **The Analytics service agent may write the dataset.** Console linking grants
   this. If the link was created through the API, grant
   `firebase-measurement@system.gserviceaccount.com` **BigQuery User** and
   **BigQuery Job User**.
3. **The analytics service account may read it.** Grant
   `analytics-reporter@bite-tribe.iam.gserviceaccount.com`
   `roles/bigquery.jobUser` on the project (to run queries) and
   `roles/bigquery.dataViewer` on the project or the export dataset (to read
   it). Reporting needed no project IAM at all; querying does — without this,
   `npm run analytics:query` fails with `bigquery.jobs.create` denied.

```bash
gcloud projects add-iam-policy-binding bite-tribe \
  --member=serviceAccount:analytics-reporter@bite-tribe.iam.gserviceaccount.com \
  --role=roles/bigquery.jobUser
gcloud projects add-iam-policy-binding bite-tribe \
  --member=serviceAccount:analytics-reporter@bite-tribe.iam.gserviceaccount.com \
  --role=roles/bigquery.dataViewer
```

### Running checked-in SQL

Queries live in `queries/*.sql` so analysis is reviewable and repeatable. Each
file may use two placeholders that the runner fills in:

- `${EVENTS_TABLE}` — the fully qualified wildcard events table.
- `@start_date` / `@end_date` — the window as `YYYYMMDD` strings, for
  `_TABLE_SUFFIX`.

```bash
npm run analytics:query -- --list                       # checked-in queries
npm run analytics:query -- event-counts                 # last 7 days
npm run analytics:query -- event-counts --days=30 --json
npm run analytics:query -- event-counts --dry-run       # resolved SQL, no API call
npm run analytics:query -- event-counts --intraday      # streaming tables
```

`_TABLE_SUFFIX BETWEEN @start_date AND @end_date` excludes the intraday tables
on its own, because their suffix under the `events_*` wildcard sorts outside a
numeric date range. `--intraday` switches the wildcard rather than the filter.

## Config-as-code: key events + custom dimensions

`provision-ga4.mjs` registers the launch **key events** (conversions) and the
**custom dimensions** for event parameters (`method`, `verified`, `rating`,
`description`, `fatal`) via the Analytics Admin API, so they show up in GA4
reports and are queryable. `description` is what the top-unhandled-errors
breakdown groups by.

```bash
npm run analytics:provision            # prints the plan (safe, no changes)
npm run analytics:provision -- --apply # creates anything missing (idempotent)
```

Extra one-time requirements for `--apply` (reads only, dry-run needs nothing):

1. Enable the **Analytics Admin API** (`analyticsadmin.googleapis.com`) in the
   Cloud project.
2. Raise the service account's role on the GA4 property from **Viewer** to
   **Editor** (Analytics → Admin → Property Access Management).

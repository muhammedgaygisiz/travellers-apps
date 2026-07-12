# Analytics tooling

Agent-operable access to the launch analytics defined in
[`ssot/pages/Implementation - Analytics Events.md`](../../ssot/pages/Implementation%20-%20Analytics%20Events.md).

- **`dashboard.config.mjs`** — dashboard-as-code: the launch monitoring tiles
  (one source of truth for the report and the docs).
- **`report.mjs`** — queries the tiles against the GA4 Data API and prints the
  metrics. Run it via `npm run analytics:report`.

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
(`expect: { min, maxDropPct }`).

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

Event-count and active-user tiles are queried live. Two tiles are console-only
because a single Data API call can't express them, and are printed as pointers:

- **D1 / D7 retention** — GA4 → Retention / cohort exploration.
- **Crash-free users** — Firebase Crashlytics (+ the `exception` event in GA4).

## Config-as-code: key events + custom dimensions

`provision-ga4.mjs` registers the launch **key events** (conversions) and the
**custom dimensions** for event parameters (`method`, `verified`, `rating`) via
the Analytics Admin API, so they show up in GA4 reports and are queryable.

```bash
npm run analytics:provision            # prints the plan (safe, no changes)
npm run analytics:provision -- --apply # creates anything missing (idempotent)
```

Extra one-time requirements for `--apply` (reads only, dry-run needs nothing):

1. Enable the **Analytics Admin API** (`analyticsadmin.googleapis.com`) in the
   Cloud project.
2. Raise the service account's role on the GA4 property from **Viewer** to
   **Editor** (Analytics → Admin → Property Access Management).

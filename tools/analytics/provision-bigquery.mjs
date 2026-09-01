/**
 * Provision and inspect the GA4 → BigQuery export (Analytics Admin API).
 *
 * The export is the foundation for every analysis the Data API cannot express:
 * retention cohorts, funnels, and joins against Firestore data. This script
 * owns the link as config-as-code so the export is reproducible instead of a
 * click someone once made in the console.
 *
 * Safe by default: prints the plan. `--status` reads the current state,
 * `--apply` creates the link if it is missing (idempotent).
 *
 * Usage:
 *   node tools/analytics/provision-bigquery.mjs             # dry-run plan
 *   node tools/analytics/provision-bigquery.mjs --status    # link + dataset state
 *   node tools/analytics/provision-bigquery.mjs --apply     # create the link
 *
 * `--status` needs only Viewer on the GA4 property. `--apply` needs
 * **Administrator** on the property and BigQuery write access in the target
 * Cloud project — see the prerequisites in README.md.
 */

import { fail, loadEnv, resolvePropertyId } from './ga4.mjs';
import {
  createBigQueryClient,
  datasetIdFor,
  getDataset,
  listTables,
  resolveDatasetLocation,
  resolveProjectId,
  tryResolveProjectId,
} from './bigquery.mjs';

loadEnv();

/**
 * Advertising identifiers are deliberately excluded. BiteTribe runs no ad
 * attribution, and exporting IDFA/AAID would widen the PII surface that
 * [[issue-989]] has to defend for no analytical gain.
 */
const INCLUDE_ADVERTISING_ID = false;

/**
 * Creating a link needs **Administrator** on the property, a tier above the
 * Editor that `provision-ga4.mjs` needs: with Editor, every read here succeeds
 * and only `createBigQueryLink` is denied, which reads like a broken script
 * rather than a missing grant unless it is spelled out.
 */
const ADMIN_HINT =
  'Creating a BigQuery link needs the service account to have **Administrator** ' +
  'on the GA4 property (Analytics → Admin → Property Access Management) — ' +
  'Editor is enough to read links but not to create one — plus permission to ' +
  'create the dataset in the target Cloud project. See tools/analytics/README.md.';

const USAGE = `Provision the GA4 → BigQuery export

Usage:
  node tools/analytics/provision-bigquery.mjs [--status | --apply] [--streaming]

Options:
  --status      Print the current link, dataset and delivered tables.
  --apply       Create the export link if it is missing (idempotent).
  --streaming   Also enable the streaming (intraday) export. Daily-only by
                default: streaming is billed per GB ingested, and daily export
                is what cohorts and funnels read.
  --location=<loc>
                Dataset location for a new link (default ${resolveDatasetLocation()},
                or BIGQUERY_DATASET_LOCATION). Fixed at creation — GA4 cannot
                move the dataset afterwards.
  --help        Show this help.`;

function parseArgs(argv) {
  const args = {
    status: false,
    apply: false,
    streaming: false,
    location: null,
    help: false,
  };
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--status') args.status = true;
    else if (raw === '--apply') args.apply = true;
    else if (raw === '--streaming') args.streaming = true;
    else if (raw.startsWith('--location=')) {
      args.location = raw.slice('--location='.length);
      if (!args.location) fail('--location must not be empty.');
    } else fail(`Unknown argument "${raw}". Try --help.`);
  }
  if (args.status && args.apply) {
    fail('Pass either --status or --apply, not both.');
  }
  return args;
}

async function createAdminClient() {
  let AnalyticsAdminServiceClient;
  try {
    ({ AnalyticsAdminServiceClient } = await import('@google-analytics/admin'));
  } catch {
    fail(
      'The "@google-analytics/admin" package is not installed. Run `npm install` first.',
    );
  }
  return new AnalyticsAdminServiceClient();
}

/**
 * The link config we intend to create. `exportStreams` is left unset on
 * purpose: GA4 then exports every data stream on the property, so a stream
 * added later (a fourth platform, say) is included without editing this file.
 */
function plannedLink({ projectId, location, streaming }) {
  return {
    project: `projects/${projectId}`,
    dailyExportEnabled: true,
    streamingExportEnabled: streaming,
    includeAdvertisingId: INCLUDE_ADVERTISING_ID,
    excludedEvents: [],
    datasetLocation: location,
  };
}

function printPlan({ propertyId, projectId, location, streaming }) {
  const dataset = datasetIdFor(propertyId);
  console.log('Planned GA4 → BigQuery export link:\n');
  console.log(
    JSON.stringify(plannedLink({ projectId, location, streaming }), null, 2),
  );
  console.log(`\nProperty:  properties/${propertyId}`);
  console.log(`Dataset:   ${projectId}.${dataset} (${location})`);
  console.log(
    `Tables:    ${dataset}.events_YYYYMMDD (daily, ~24h behind)` +
      (streaming ? `, ${dataset}.events_intraday_YYYYMMDD (streaming)` : ''),
  );
  console.log(
    '\nPrerequisites in the Cloud project (one-time, not automated):',
  );
  console.log('- Billing enabled, and the BigQuery API turned on.');
  console.log(
    '- BigQuery User + Job User granted to the Analytics service agent ' +
      'firebase-measurement@system.gserviceaccount.com.',
  );
  console.log(
    '\nDry run. Re-run with --apply to create the link, or --status to inspect it.',
  );
}

function describeLink(link) {
  const modes = [
    link.dailyExportEnabled ? 'daily' : null,
    link.streamingExportEnabled ? 'streaming' : null,
    link.freshDailyExportEnabled ? 'fresh-daily' : null,
  ].filter(Boolean);
  const streams =
    link.exportStreams?.length > 0
      ? link.exportStreams.map((s) => s.split('/').pop()).join(', ')
      : 'all streams';
  return (
    `- ${link.name}\n` +
    `  project: ${link.project}\n` +
    `  export: ${modes.join(' + ') || 'none'}\n` +
    `  streams: ${streams}\n` +
    `  advertising id: ${link.includeAdvertisingId ? 'included' : 'excluded'}` +
    (link.excludedEvents?.length
      ? `\n  excluded events: ${link.excludedEvents.join(', ')}`
      : '')
  );
}

async function listLinks(propertyId) {
  const admin = await createAdminClient();
  try {
    const [links] = await admin.listBigQueryLinks({
      parent: `properties/${propertyId}`,
    });
    return links;
  } catch (error) {
    handleAdminError(error);
    return []; // unreachable — handleAdminError exits
  }
}

async function runStatus({ propertyId, projectId }) {
  const links = await listLinks(propertyId);
  console.log(`GA4 → BigQuery export — property ${propertyId}\n`);
  if (links.length === 0) {
    console.log(
      'No export link. Run `npm run analytics:bigquery -- --apply` to create one.',
    );
    return;
  }
  console.log('Links:');
  for (const link of links) console.log(describeLink(link));

  const datasetId = datasetIdFor(propertyId);
  const client = await createBigQueryClient();
  const dataset = await getDataset(client, projectId, datasetId);
  console.log(`\nDataset ${projectId}.${datasetId}:`);
  if (!dataset) {
    console.log(
      '- not created yet. GA4 creates it with the first delivery, up to 24h ' +
        'after the link is enabled.',
    );
    return;
  }
  console.log(`- location: ${dataset.location}`);

  const tables = await listTables(client, projectId, datasetId);
  if (tables.length === 0) {
    console.log('- no tables delivered yet.');
    return;
  }
  const daily = tables.filter((t) => t.startsWith('events_2'));
  const intraday = tables.filter((t) => t.startsWith('events_intraday_'));
  console.log(`- tables: ${tables.length}`);
  if (daily.length > 0) {
    console.log(
      `- daily: ${daily.length} (${daily[0]} … ${daily[daily.length - 1]})`,
    );
  }
  if (intraday.length > 0) console.log(`- intraday: ${intraday.join(', ')}`);
}

async function runApply({ propertyId, projectId, location, streaming }) {
  const existing = await listLinks(propertyId);
  if (existing.length > 0) {
    console.log('Export link already exists — nothing to create.\n');
    for (const link of existing) console.log(describeLink(link));
    console.log(
      '\nChange the export mode in the GA4 console, or delete the link and ' +
        're-apply; this script never edits a link it did not create.',
    );
    return;
  }

  const admin = await createAdminClient();
  try {
    const [link] = await admin.createBigQueryLink({
      parent: `properties/${propertyId}`,
      bigqueryLink: plannedLink({ projectId, location, streaming }),
    });
    console.log('Created export link:\n');
    console.log(describeLink(link));
    console.log(
      `\nThe first daily table lands in ${projectId}.${datasetIdFor(propertyId)} ` +
        'within 24h. Check with `npm run analytics:bigquery -- --status`.',
    );
  } catch (error) {
    handleAdminError(error);
  }
}

function handleAdminError(error) {
  const message = String(error?.message ?? error);
  if (
    /PERMISSION_DENIED|UNAUTHENTICATED|credential|API has not been used|SERVICE_DISABLED/i.test(
      message,
    )
  ) {
    console.error(`error: ${message}\n\n${ADMIN_HINT}`);
    process.exit(1);
  }
  fail(message);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const location = args.location ?? resolveDatasetLocation();

  // The plan is printable without credentials, the same way `report.mjs
  // --dry-run` is, so the intended config can be reviewed before anyone holds
  // a key.
  if (!args.status && !args.apply) {
    printPlan({
      propertyId: process.env.GA4_PROPERTY_ID || '<GA4_PROPERTY_ID>',
      projectId: tryResolveProjectId() ?? '<BIGQUERY_PROJECT_ID>',
      location,
      streaming: args.streaming,
    });
    return;
  }

  const propertyId = resolvePropertyId();
  const projectId = resolveProjectId();

  if (args.status) {
    await runStatus({ propertyId, projectId });
    return;
  }
  await runApply({
    propertyId,
    projectId,
    location,
    streaming: args.streaming,
  });
}

main().catch((error) => fail(String(error?.message ?? error)));

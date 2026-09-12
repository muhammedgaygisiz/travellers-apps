/**
 * Provision GA4 config-as-code (Analytics Admin API).
 *
 * Registers the launch **key events** (conversions) and the **custom
 * dimensions** for event parameters, so they become first-class in GA4 reports
 * and queryable via the Data API. Derived from the taxonomy in
 * `libs/common/ta-firestore/src/lib/analytics/analytics-events.ts`.
 *
 * Safe by default: prints the plan. Pass `--apply` to create anything missing
 * (idempotent — existing entries are skipped).
 *
 * Usage:
 *   node tools/analytics/provision-ga4.mjs           # dry-run plan
 *   node tools/analytics/provision-ga4.mjs --apply   # create missing entries
 *
 * Requires the service account to have **Editor** on the GA4 property and the
 * Analytics Admin API (analyticsadmin.googleapis.com) enabled. See README.md.
 */

import { fail, loadEnv, resolvePropertyId } from './ga4.mjs';

loadEnv();

/** Events promoted to GA4 key events (conversions). */
const KEY_EVENTS = [
  'sign_up',
  'bite_created',
  'bucketlist_created',
  'bucketlist_rated',
];

/**
 * Parameters and properties promoted to custom dimensions.
 *
 * `scope` defaults to `EVENT`. A `USER`-scoped entry describes the person
 * rather than the event, which is what a filter over `activeUsers` needs.
 *
 * Only low-cardinality values are registered. GA4 allows 50 event-scoped
 * dimensions and collapses a high-cardinality one into `(other)` rows, so the
 * ids the table operations of issue #1098 carry - `restaurant_id`, `table_id`,
 * `visit_id` - are deliberately absent: they are read from the BigQuery export
 * by `queries/table-operations.sql`, which carries every parameter whether GA4
 * knows it or not.
 */
const CUSTOM_DIMENSIONS = [
  { parameterName: 'method', displayName: 'Sign up method' },
  { parameterName: 'verified', displayName: 'Restaurant verified' },
  { parameterName: 'rating', displayName: 'BiteTrail rating' },
  // Stability. `FirebaseErrorHandlerService` sends both parameters on every
  // `exception` event; without the dimension the digest can count errors but
  // not name them. GA4 does not backfill, so registering this late means the
  // top-errors breakdown starts from the day it is applied.
  { parameterName: 'description', displayName: 'Error description' },
  { parameterName: 'fatal', displayName: 'Error fatal' },
  // Table operations (issue #1098). `from_status` is what separates freeing an
  // occupied table from putting a blocked one back into service, and `outcome`
  // a visit staff closed from one nobody ever looked at.
  { parameterName: 'from_status', displayName: 'Table status left' },
  { parameterName: 'outcome', displayName: 'Visit outcome' },
  // Which app the session came from (issue #1098). Both apps report to one
  // property through one measurement id, so this is the only thing separating
  // a staff shift from a diner's session - and `activeUsers` counts people,
  // which is why it is user-scoped rather than event-scoped.
  {
    parameterName: 'app_surface',
    displayName: 'App surface',
    scope: 'USER',
  },
];

const EDITOR_HINT =
  'This needs the service account to have Editor on the GA4 property ' +
  '(Analytics → Admin → Property Access Management) and the Analytics Admin ' +
  'API enabled (analyticsadmin.googleapis.com). See tools/analytics/README.md.';

function parseArgs(argv) {
  const args = { apply: false, help: false };
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw === '--apply') args.apply = true;
    else fail(`Unknown argument "${raw}". Try --help.`);
  }
  return args;
}

const USAGE = `Provision GA4 config-as-code (key events + custom dimensions)

Usage:
  node tools/analytics/provision-ga4.mjs [--apply]

Options:
  --apply   Create missing key events and custom dimensions (default: dry-run).
  --help    Show this help.`;

function printPlan() {
  console.log('Planned GA4 config (derived from the event taxonomy):\n');
  console.log('Key events (conversions):');
  for (const e of KEY_EVENTS) console.log(`- ${e}`);
  console.log('\nCustom dimensions:');
  for (const d of CUSTOM_DIMENSIONS) {
    console.log(
      `- ${d.parameterName} — "${d.displayName}" [${scopeOf(d)}-scoped]`,
    );
  }
}

async function apply(propertyId) {
  let AnalyticsAdminServiceClient;
  try {
    ({ AnalyticsAdminServiceClient } = await import('@google-analytics/admin'));
  } catch {
    fail(
      'The "@google-analytics/admin" package is not installed. Run `npm install` first.',
    );
  }

  const client = new AnalyticsAdminServiceClient();
  const parent = `properties/${propertyId}`;

  try {
    await provisionKeyEvents(client, parent);
    await provisionCustomDimensions(client, parent);
  } catch (error) {
    handleAdminError(error);
  }
  console.log('\nDone.');
}

async function provisionKeyEvents(client, parent) {
  const hasKeyEvents =
    typeof client.listKeyEvents === 'function' &&
    typeof client.createKeyEvent === 'function';

  console.log('\nKey events:');
  if (hasKeyEvents) {
    const [existing] = await client.listKeyEvents({ parent });
    const known = new Set(existing.map((k) => k.eventName));
    for (const eventName of KEY_EVENTS) {
      if (known.has(eventName)) {
        console.log(`- ${eventName} (exists)`);
        continue;
      }
      await client.createKeyEvent({ parent, keyEvent: { eventName } });
      console.log(`- ${eventName} (created)`);
    }
    return;
  }

  // Fallback for older Admin API surfaces.
  const [existing] = await client.listConversionEvents({ parent });
  const known = new Set(existing.map((k) => k.eventName));
  for (const eventName of KEY_EVENTS) {
    if (known.has(eventName)) {
      console.log(`- ${eventName} (exists)`);
      continue;
    }
    await client.createConversionEvent({
      parent,
      conversionEvent: { eventName },
    });
    console.log(`- ${eventName} (created)`);
  }
}

/** A dimension's scope, defaulting to the event it was sent with. */
function scopeOf(dimension) {
  return dimension.scope ?? 'EVENT';
}

async function provisionCustomDimensions(client, parent) {
  console.log('\nCustom dimensions:');
  const [existing] = await client.listCustomDimensions({ parent });
  const known = new Set(existing.map((d) => d.parameterName));
  for (const dim of CUSTOM_DIMENSIONS) {
    if (known.has(dim.parameterName)) {
      console.log(`- ${dim.parameterName} (exists)`);
      continue;
    }
    await client.createCustomDimension({
      parent,
      customDimension: {
        parameterName: dim.parameterName,
        displayName: dim.displayName,
        scope: scopeOf(dim),
      },
    });
    console.log(`- ${dim.parameterName} (created, ${scopeOf(dim)}-scoped)`);
  }
}

function handleAdminError(error) {
  const message = String(error?.message ?? error);
  if (
    /PERMISSION_DENIED|UNAUTHENTICATED|credential|API has not been used|SERVICE_DISABLED/i.test(
      message,
    )
  ) {
    console.error(`error: ${message}\n\n${EDITOR_HINT}`);
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

  if (!args.apply) {
    printPlan();
    console.log('\nDry run. Re-run with --apply to create missing entries.');
    return;
  }

  const propertyId = resolvePropertyId();
  await apply(propertyId);
}

main().catch((error) => fail(String(error?.message ?? error)));

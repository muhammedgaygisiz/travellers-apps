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

/** Event parameters promoted to event-scoped custom dimensions. */
const CUSTOM_DIMENSIONS = [
  { parameterName: 'method', displayName: 'Sign-up method' },
  { parameterName: 'verified', displayName: 'Restaurant verified' },
  { parameterName: 'rating', displayName: 'BiteTrail rating' },
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
  console.log('\nCustom dimensions (event-scoped):');
  for (const d of CUSTOM_DIMENSIONS) {
    console.log(`- ${d.parameterName} — "${d.displayName}"`);
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
        scope: 'EVENT',
      },
    });
    console.log(`- ${dim.parameterName} (created)`);
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

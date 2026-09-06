/**
 * Bootstraps and repairs BiteTribe roles from a workstation.
 *
 * Roles are otherwise written only by the `setUserRoles` callable, which
 * requires the caller to already hold `admin`. That is a chicken-and-egg
 * problem twice over: the very first operator account has no admin to grant it
 * one, and if every admin role were ever lost the tool that grants roles would
 * be unreachable. This script is the way out of both, so it deliberately does
 * not go through the callable and does not check the caller's roles — it runs
 * on service-account credentials, and holding those already means holding the
 * project.
 *
 * It replaces the account's whole role set, matching the callable, so revoking
 * is the same call with the role left out.
 *
 * Usage, from `apps/bite-tribe-firebase`:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/grant-role.mjs --email you@bitetribe.app --roles admin
 *
 * `gcloud auth application-default login` works in place of the key file.
 * Pass `--uid` instead of `--email` when the address is ambiguous, and
 * `--roles ''` to strip every role from an account.
 *
 * See GitHub issue #1469.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const KNOWN_ROLES = ['admin', 'business'];
const ROLES_CLAIM = 'roles';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'bite-tribe';

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (!flag.startsWith('--')) {
      continue;
    }

    args[flag.slice(2)] = argv[index + 1] ?? '';
    index += 1;
  }

  return args;
};

const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

const { email, uid, roles: rawRoles } = parseArgs(process.argv.slice(2));

if (!email && !uid) {
  fail('Pass --email <address> or --uid <firebase-uid>.');
}

if (rawRoles === undefined) {
  fail(
    `Pass --roles <comma-separated>. Known roles: ${KNOWN_ROLES.join(', ')}. Use --roles '' to revoke all.`,
  );
}

const roles = rawRoles
  .split(',')
  .map((role) => role.trim())
  .filter(Boolean);

const unknownRoles = roles.filter((role) => !KNOWN_ROLES.includes(role));

if (unknownRoles.length) {
  fail(
    `Unknown role(s): ${unknownRoles.join(', ')}. Known roles: ${KNOWN_ROLES.join(', ')}.`,
  );
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

const auth = getAuth();

const user = await (uid ? auth.getUser(uid) : auth.getUserByEmail(email)).catch(
  (error) => fail(`Could not find that account: ${error.message}`),
);

// `setCustomUserClaims` replaces the whole claim object rather than merging
// into it, so anything else the account carries has to be read and written
// back with the roles.
const existingClaims = user.customClaims ?? {};
const uniqueRoles = [...new Set(roles)];

await auth.setCustomUserClaims(user.uid, {
  ...existingClaims,
  [ROLES_CLAIM]: uniqueRoles,
});

console.log(
  `\n${user.email ?? user.uid} now holds: ${uniqueRoles.length ? uniqueRoles.join(', ') : '(no roles)'}`,
);
console.log(
  'It reaches the client on its next ID token refresh, which the role guard forces on a miss.\n',
);

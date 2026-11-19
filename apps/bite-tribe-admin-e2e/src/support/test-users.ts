/**
 * Users seeded into the Firebase Auth emulator via
 * apps/bite-tribe-firebase/.firebase-export/auth_export/accounts.json.
 * Keep in sync with that export.
 *
 * `operator` carries `{"roles":["admin"]}`, which the admin app requires at
 * sign-in (issue #1469).
 */
export const TEST_USERS = {
  operator: {
    uid: 'aDm1nOperatorSeedAccount01Xy',
    email: 'admin@test.com',
    password: 'Test4711',
  },
} as const;

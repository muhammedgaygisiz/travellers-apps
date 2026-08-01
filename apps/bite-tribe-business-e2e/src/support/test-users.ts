/**
 * Users seeded into the Firebase Auth emulator via
 * apps/bite-tribe-firebase/.firebase-export/auth_export/accounts.json.
 * Keep in sync with that export.
 *
 * The business suite drives the `organisation` account: the business app has no
 * onboarding, so any seeded account can sign in, and this one is the one the
 * SSOT describes as the business actor.
 */
export const TEST_USERS = {
  organisation: {
    uid: 'gSJki3B6jFSYQWlZZSUtb58iN7tA',
    email: 'organisation@test.com',
    password: 'Test4711',
  },
} as const;

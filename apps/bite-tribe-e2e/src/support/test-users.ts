/**
 * Users seeded into the Firebase Auth emulator via
 * apps/bite-tribe-firebase/.firebase-export/auth_export/accounts.json.
 * Keep in sync with that export.
 */
export const TEST_USERS = {
  default: { email: 'test@test.com', password: 'Test4711' },
  organisation: { email: 'organisation@test.com', password: 'Test4711' },
} as const;

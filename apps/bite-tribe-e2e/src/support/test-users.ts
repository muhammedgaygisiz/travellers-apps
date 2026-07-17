/**
 * Users seeded into the Firebase Auth emulator via
 * apps/bite-tribe-firebase/.firebase-export/auth_export/accounts.json.
 * Keep in sync with that export.
 */
export const TEST_USERS = {
  default: {
    uid: 'helULN26hP9Qeig6NQLIEcEe3AP6',
    email: 'test@test.com',
    password: 'Test4711',
  },
  organisation: {
    uid: 'gSJki3B6jFSYQWlZZSUtb58iN7tA',
    email: 'organisation@test.com',
    password: 'Test4711',
  },
} as const;

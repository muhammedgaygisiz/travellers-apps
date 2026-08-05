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
  /**
   * Kept out of every other journey so a spec can rely on what this account does
   * *not* own. `default` is shared, and specs seed bucket lists onto it freely,
   * so an empty-state precondition can only be stated here.
   */
  fresh: {
    uid: 'sKjq4POYpxuV27V3JIJfshUre4Cw',
    email: 'test2@test.com',
    password: 'Test4711',
  },
} as const;

export type TestUser = (typeof TEST_USERS)[keyof typeof TEST_USERS];

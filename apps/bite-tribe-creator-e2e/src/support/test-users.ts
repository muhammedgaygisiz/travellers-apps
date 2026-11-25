/**
 * Users seeded into the Firebase Auth emulator via
 * apps/bite-tribe-firebase/.firebase-export/auth_export/accounts.json.
 * Keep in sync with that export.
 *
 * `withoutRoles` holds no role at all. Creating a BiteTrail needs none
 * (`RD-UR-4`), so the creator suite signs in with exactly that account: a pass
 * with a role-holding account would prove nothing about the open gate.
 * `business` holds `business`, and creates through the same surface.
 */
export const TEST_USERS = {
  withoutRoles: {
    uid: 'helULN26hP9Qeig6NQLIEcEe3AP6',
    email: 'test@test.com',
    password: 'Test4711',
  },
  business: {
    uid: 'gSJki3B6jFSYQWlZZSUtb58iN7tA',
    email: 'organisation@test.com',
    password: 'Test4711',
  },
} as const;

/**
 * Users seeded into the Firebase Auth emulator via
 * apps/bite-tribe-firebase/.firebase-export/auth_export/accounts.json.
 * Keep in sync with that export.
 *
 * The business suite drives the `organisation` account. Since issue #1469 the
 * business app requires the `business` role at sign-in, so that account carries
 * a `customAttributes` entry in the export granting it. Without it the login
 * itself fails — with the same generic error a wrong password produces — and
 * every business scenario stops at the login page.
 *
 * `withoutRoles` is a seeded consumer account holding no roles at all. It is
 * what the deny case is written against, and it must stay role-less.
 */
export const TEST_USERS = {
  organisation: {
    uid: 'gSJki3B6jFSYQWlZZSUtb58iN7tA',
    email: 'organisation@test.com',
    password: 'Test4711',
  },
  withoutRoles: {
    uid: 'helULN26hP9Qeig6NQLIEcEe3AP6',
    email: 'test@test.com',
    password: 'Test4711',
  },
} as const;

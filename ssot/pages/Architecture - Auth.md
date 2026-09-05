# Architecture - Auth

## Purpose

Auth establishes user identity for app access, profile creation, user-scoped data, analytics identity, and backend callable authorization.

## Main Flow

```text
User authenticates
|
AuthService tracks current user
|
Routes are guarded
|
Profile data is created or loaded
|
Store and API services use user identity
|
Backend callables validate request.auth where required
```

## Auth Surfaces

- `AuthService` wraps Capacitor Firebase Authentication, and reports when the
  persisted session has been restored so nothing decides on the current user
  before that answer exists.
- `withAuthRoutes` provides shared auth routes.
- `authGuard` protects authenticated routes.
- `roleGuard(role)` protects the privileged apps' routes on top of `authGuard`,
  and `NoAccessComponent` is where it sends an account that lacks the role.
- `setUserRoles` is the admin-only callable that writes roles, and
  `grant-role.mjs` is the service-account bootstrap behind it.
- `startGuard` controls the start route.
- `RequestedUrlService` holds the URL a visitor asked for while auth redirected
  them, so signing in returns them to it instead of to Home.
- `createUserOnAuthCreate` initializes profile-related backend behavior.
- `updateLastSeen` records activity through a legacy callable for older app versions.
- `updateUserMetadata` records current app activity and client version/build metadata through a callable.
- `syncEmailVerificationStatus` mirrors Firebase Auth verification state into the public user document on app start/resume.
- `resendEmailVerification` lets eligible email/password users request a Firebase email verification link through the backend.
- `sendEmailVerificationReminders` sends monthly backend reminders for eligible unverified email/password accounts.

## Cold Start Rules

- On the web, `getCurrentUser()` answers from `auth.currentUser`, which is still
  null while the persisted session is read out of IndexedDB. A cold load
  therefore starts with a signed-in visitor looking signed out.
- The conclusive answer is the first `authStateChange` event, which arrives for
  a signed-out visitor too. Guards and gates wait on that, bounded, rather than
  on a fixed delay. Native SDKs answer from an already-restored session, so
  their first answer is taken as final and startup timing is unchanged there.
- Angular runs a route's `canActivate` guards alongside each other, not one
  after the other. Every guard that reads the current user has to wait for
  restoration itself; waiting in `authGuard` alone does not protect the guards
  running next to it.
- A guard that redirects away from a requested URL remembers it, and a guard
  that resolves a visitor into the app hands it back. That keeps a shared Bite
  link alive across the whole entry chain. See the Shared Link Entry Contract in
  [[UC - Inspect Bite Details]].

## Roles And Authorization

Authentication answers _who is signed in_. Authorization answers _which app is
theirs_, and until issue \#1469 nothing answered it: `authGuard` was the only
check on either privileged app, so any BiteTribe account could open the business
app and run the operational migrations in it.

- A role is a Firebase Auth **custom claim** carried in the ID token. Claims are
  written only by the backend, so a client cannot forge one.
- Two roles exist: `admin` for BiteTribe operators, `business` for a restaurant
  that has been granted maintenance rights. They are separate rather than a
  hierarchy — an operator account is not a restaurant, and granting it
  restaurant rights by implication would defeat the ownership gate for exactly
  the accounts most able to break it.
- They live in one array under one claim key, `roles`, because Firebase caps the
  whole custom-claim payload at 1000 bytes and reserves a fixed set of names.
- `setUserRoles` is the only callable that writes them, and it requires the
  caller to already hold `admin`. It replaces the whole role set, so revoking is
  granting with the role left out, and it refuses to let an admin drop their own
  `admin` role.
- `grant-role.mjs` is the way in and the way back. The first operator account
  has no admin to grant it one, and if every `admin` were lost the tool that
  grants roles would be unreachable. The script runs on service-account
  credentials and deliberately checks nothing, because holding those credentials
  already means holding the project.
- `roleGuard(role)` is the client half. It is a routing and display answer, not
  the authorization answer: every privileged callable re-reads the claim from
  the token Firebase verified. What it buys is that a rejected account is told
  so rather than reaching a page whose every request then fails.
- A cached ID token can be an hour old, so `roleGuard` retries once against a
  freshly minted token before rejecting. That is what makes a role granted
  moments ago take effect without signing out and back in.
- A signed-in account without the role goes to `NO_ACCESS`, never back to
  `START`. `START` offers only a sign-in the account has already completed, so
  sending it there states the problem wrongly. Note that `startGuard` is used
  **only** by the consumer shell; the two apps `roleGuard` protects do not
  route through it, so this is about the message rather than a redirect loop.
- The role gate shipped **hard, with no backfill**. An account that could sign
  into the business app before the role existed cannot now unless an operator
  granted it. See issue \#1469 for the reasoning.

The **backend** half of authorization is still open: `firestore.rules` grants
read and write on every document to every authenticated user. Replacing it is
issue \#1078, deliberately kept out of the change that introduced the roles.
Until it lands, the role gate is a client-side gate over an open database.

## Supported Auth Modes

- Email and password.
- Password reset email for email/password accounts.
- Google account.
- Apple account.
- Email verification.
- Logout.

Email verification is non-blocking. Password-only accounts require verification prompts and reminders; accounts with trusted Google or Apple provider links are considered verified enough for this lifecycle. Unknown provider combinations are logged but do not receive automatic reminders.

## Provider Data Rules

See [[issue-1385]] for what reading these positionally cost.

- `user.providerData` is **not** the same list on every platform. The Android
  SDK includes Firebase's own reserved record - `providerId` of `firebase`, the
  user itself rather than a sign-in method - alongside the real providers; the
  web and iOS SDKs list linked providers only.
- Anything deriving a sign-in method reads the first entry that is not that
  reserved record, never `providerData[0]`. Positional reads look correct on the
  web, where they are developed and tested, and identify every Android account
  as unknown in production.
- Code that branches on the resolved provider treats "not recognised" as a
  reason to fall back to email and password, not as a reason to attempt a
  provider flow. An unmapped id is the expected outcome of an SDK change, and it
  must not be able to make a user-facing flow unreachable.

## Sign-In Feedback Contract

See [issue 1273](https://github.com/muhammedgaygisiz/travellers-apps/issues/1273) for the reasoning. Sign-in is not fast - it is a network
round-trip, auth-state propagation, and the guard chain - so it reports itself
the same way registration does rather than inventing a second pattern.

- The pending state is store state, not component state. `authenticationPending`
  in the auth reducer is raised by all three sign-in entry points (email and
  password, Google, Apple) and lowered by every outcome: success, failure, a
  provider failure reported as `registrationFailed`, and logout. The login page
  reads it through `selectLoginPending` and `StoreService.loginPending`.
- While it is raised the page runs the header progress bar, the submit action
  locks behind a pending label with a spinner, and the provider buttons lock
  with it. All three actions guard themselves in code as well, because a tap
  can be queued between the click and the flag turning on.
- A new sign-in clears the previous failure, so a retry is not shown spinning
  underneath a stale error. The failure itself still surfaces exactly as before.
- The email/password round-trip is bounded at 30 seconds and a timeout reports
  itself as a normal login failure. The form is locked while the request runs,
  so a request that never settles would otherwise lock the form with it. The
  native provider sheets are deliberately unbounded: the user is typing a
  password in someone else's UI there.
- The sign-in effects are `exhaustMap`, so a duplicate action is dropped rather
  than racing a second credential submission.

## Code Anchors

```text
libs/common/ta-firestore/src/lib/auth.service.ts
libs/common/ta-firestore/src/lib/auth.guard.ts
libs/common/ta-firestore/src/lib/role.guard.ts
libs/common/ta-firestore/src/lib/no-access/no-access.component.ts
libs/common/utils/src/lib/user-role.ts
libs/common/ta-firestore/src/lib/start.guard.ts
libs/common/ta-firestore/src/lib/requested-url.service.ts
libs/bite-tribe/onboarding/guards/src/lib/onboarding.guard.ts
libs/bite-tribe/onboarding/guards/src/lib/onboarding-completed.guard.ts
libs/common/ui/auth
libs/bite-tribe/shell/src/lib/routes.ts
libs/bite-tribe-business/shell/src/lib/routes.ts
libs/bite-tribe-admin/shell/src/lib/routes.ts
apps/bite-tribe-firebase/functions/src/functions/shared/roles.ts
apps/bite-tribe-firebase/functions/src/functions/users/set-user-roles.ts
apps/bite-tribe-firebase/scripts/grant-role.mjs
apps/bite-tribe-firebase/functions/src/functions/users/create-user-on-auth-create.ts
apps/bite-tribe-firebase/functions/src/functions/users/update-last-seen.ts
apps/bite-tribe-firebase/functions/src/functions/users/update-user-metadata.ts
apps/bite-tribe-firebase/functions/src/functions/users/resend-email-verification.ts
apps/bite-tribe-firebase/functions/src/functions/users/sync-email-verification-status.ts
apps/bite-tribe-firebase/functions/src/functions/users/send-email-verification-reminders.ts
```

## Current Limitations

- Onboarding after registration is still a product gap.
- Public/private profile intent needs clearer user guidance.
- Backend callable auth checks need to remain consistent as more write/query logic moves server-side.
- Roles are enforced in route guards and in `setUserRoles`, but not yet in Firestore rules (\#1078) or in the other privileged callables. `verifyRestaurantCandidate`, for one, still accepts any authenticated caller.

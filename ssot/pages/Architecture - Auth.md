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
- `REQUIRED_ROLE` is the role an app demands of everyone who signs into it;
  sign-in fails generically when the account does not hold it.
- `roleGuard(role)` backs that up on the routes for restored sessions and
  revoked roles.
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
- The authorization vocabulary is four roles, defined in [[User Roles]]. Two of
  them are claims in the code today.
- Two claims exist: `admin` for BiteTribe Operators, `business` for a restaurant
  that has been granted maintenance rights. They are separate rather than a
  hierarchy — an operator account is not a restaurant, and granting it
  restaurant rights by implication would defeat the ownership gate for exactly
  the accounts most able to break it.
- They live in one array under one claim key, `roles`, because Firebase caps the
  whole custom-claim payload at 1000 bytes and reserves a fixed set of names.
- `setUserRoles` is the only callable that writes them, and it requires the
  caller to already hold `admin`. `listUsersWithRoles` is its read counterpart,
  also admin-only, and reads Firebase Auth rather than the `/users` collection
  because a claim is not a document — `searchUsers` cannot answer "who is an
  admin" at all. Both back the admin app's user management. It replaces the whole role set, so revoking is
  granting with the role left out, and it refuses to let an admin drop their own
  `admin` role.
- `grant-role.mjs` is the way in and the way back. The first operator account
  has no admin to grant it one, and if every `admin` were lost the tool that
  grants roles would be unreachable. The script runs on service-account
  credentials and deliberately checks nothing, because holding those credentials
  already means holding the project.
- **The role is checked at sign-in, and a missing role fails the login.** The
  sign-in effects verify `REQUIRED_ROLE` before dispatching `loginSucceeded`,
  end the session, and report the same generic
  `something-went-wrong-please-try-again` a wrong password produces. Signing an
  account in and then refusing it a page would tell whoever is trying that the
  password was right, that the account exists, and which role guards the app. A
  generic failure tells them nothing.
- `REQUIRED_ROLE` is an injection token bound per shell: `business` in the
  business app, `admin` in the admin app, **unbound in the consumer app**. An
  unbound token means "no role required", not "no role granted", which is what
  keeps the consumer app ungated.
- `roleGuard(role)` is the backstop, not the primary gate. Sign-in already
  refuses these accounts, so it fires only for a session restored on startup
  (which reports itself as a successful login without running the sign-in
  effect) or a role revoked mid-session. It reaches the same outcome: end the
  session, raise the generic failure, return to `/login`.
- Neither path is the authorization answer. Every privileged callable re-reads
  the claim from the token Firebase verified; the client half only decides what
  a browser is shown.
- **Every HTTP endpoint is classified, and the classification is a test.** A
  callable runs with admin credentials, so no Firestore rule constrains it and
  "an authenticated caller" is not an authorization decision - it is the absence
  of one. Each endpoint in the functions source is named in
  `src/__specs__/callable-authorization.spec.ts` as `operator`, `authenticated`
  or `public`, and the spec fails when an operator endpoint does not call
  `requireAdmin`, when a consumer path does, or when a new endpoint is added
  that nobody classified. Eight are operator-only: `setUserRoles`,
  `setUserSubscriptionTier`, `listUsersWithRoles`, `verifyRestaurantCandidate`,
  `backfillBiteAddress`, `backfillReviewTimestampsCallable`,
  `clusterRestaurantCandidateForBite` and `sendNewVersionNotification`.
  `handleSharedLinkToBite` is the one public endpoint, because it is the
  redirect a shared Bite link resolves through. See issue \#1472.
- A cached ID token can be an hour old, so both paths retry once against a
  freshly minted token before rejecting. That is what keeps a role granted
  moments ago from turning away the account it was granted to.
- `endRejectedSession()` is used rather than `logout()`. `logout()` reloads the
  document, and the reload would wipe the NgRx store that carries the failure
  message the login page shows.
- The role gate shipped **hard, with no backfill**. An account that could sign
  into the business app before the role existed cannot now unless an operator
  granted it. See issue \#1469 for the reasoning.

The **backend** half of authorization is still open: `firestore.rules` grants
read and write on every document to every authenticated user. Replacing it is
issue \#1078, deliberately kept out of the change that introduced the roles.
Until it lands, the role gate is a client-side gate over an open database.

## Operator Audit Trail

What an operator did is recorded in Cloud Logging and nowhere else. There is no
in-app audit surface and none is planned at this scale: with two operators, the
cost of reading the trail is project access, and epic \#1471 took that over
building and maintaining a second record of the same events.

The decision is only worth taking while the logs are usable. A trail that has to
be read three different ways is not a trail, and by the time eight operator
callables existed there were three names for the actor - `callerUid`,
`requestedBy` and `uid` - and two callables, `verifyRestaurantCandidate` and
`clusterRestaurantCandidateForBite`, that named no actor at all. Issue \#1477
gave every operator action one shape.

- **The shape lives in `functions/src/functions/shared/operator-log.ts`**, and
  `logOperatorAction` is the only way an operator action reaches the logs. The
  actor is read off the request inside the helper rather than passed to it, so
  it cannot be forgotten and cannot be anything other than the identity Firebase
  verified. Call it after `requireAdmin`, which is what makes `request.auth`
  certain.
- **The fields are structured, never interpolated into the message.** Cloud
  Logging indexes `jsonPayload` paths, so `jsonPayload.targetId="abc"` is a
  query and the same value inside a formatted string is a substring scan.

  | Field            | Meaning                                                                                                                                        |
  | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
  | `operatorAction` | The callable's name. Both "this is an operator action" and "which one", so one field carries the marker and the filter.                        |
  | `callerUid`      | The operator. Named for what `setUserRoles` and `setUserSubscriptionTier` already wrote, so entries from before \#1477 answer the same query.  |
  | `callerRoles`    | The roles their verified ID token carried at the time.                                                                                         |
  | `targetType`     | `user`, `bite`, `restaurantCandidate`, `review` or `appInstallation`. An id alone does not say what it identifies.                             |
  | `targetId`       | The one record acted on. Absent from an action that operates on a whole collection, rather than answered with something invented.              |
  | `outcome`        | `started`, `succeeded` or `failed`. A `started` with no `succeeded` is an action that crashed or timed out, which the trail should still show. |
  | `reason`         | Why, where the action takes one. Required by `setUserSubscriptionTier`; absent elsewhere.                                                      |
  | `details`        | Everything action-specific, nested under one key so it cannot compete with the fields every action shares.                                     |

- **One field name per concept, and the spec enforces it.**
  `src/__specs__/operator-action-logging.spec.ts` fails the build when an
  operator callable does not call `logOperatorAction`, and when any callable
  writes `callerUid`, `callerRoles`, `requestedBy` or `targetUid` as a key of
  its own - which is what building a second audit shape by hand looks like. A
  read-only operator endpoint is exempt by being named in the spec, and
  `listUsersWithRoles` is the only one: a read leaves nothing to audit, and the
  admin app lists accounts often enough that logging it would bury the writes.
- **The queries the trail exists to answer**, in the Logs Explorer:

  ```text
  jsonPayload.operatorAction:*                       every operator action
  jsonPayload.targetId="<uid>"                       everything done to an account or Bite
  jsonPayload.callerUid="<uid>"                      everything one operator did
  jsonPayload.operatorAction="setUserRoles"          one kind of action
  ```

  **Entries written before \#1477 name the target `targetUid`, not `targetId`,**
  so a `targetId` query silently misses them. `callerUid` is unaffected, which
  is why it kept its name. Real examples exist: three
  `setUserSubscriptionTier` grants on 2026-09-06, the day before the deploy.
  Until the oldest of them ages out of the retention window, ask for both:

  ```text
  jsonPayload.targetId="<uid>" OR jsonPayload.targetUid="<uid>"
  ```

  This is the one place the shape genuinely replaced rather than formalised what
  was there, and it was unavoidable: \#1474 targets an account and \#1475 a
  Bite, so a user-specific field name could not carry both.

- **The trail expires, and the retention window is what bounds it.** Cloud
  Logging keeps the `_Default` bucket for 30 days on Google's default setting
  and `_Required` for 400, and operator actions land in `_Default`. **This has
  not been confirmed against the `bite-tribe` project's own configuration** -
  neither `gcloud` nor the Firebase CLI is installed on the maintainer
  workstation, so it needs one look at Logging - Logs Storage in the console.
  Until someone does, treat 30 days as the assumption the logs-only decision
  rests on rather than as a checked fact. An audit question older than the
  window has no answer at all, which is the part of this decision that has to be
  revisited if the operator team grows.

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
libs/common/ta-firestore/src/lib/ngrx-store/effects.ts
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
apps/bite-tribe-firebase/functions/src/functions/shared/operator-log.ts
apps/bite-tribe-firebase/functions/src/functions/users/set-user-roles.ts
apps/bite-tribe-firebase/functions/src/__specs__/callable-authorization.spec.ts
apps/bite-tribe-firebase/functions/src/__specs__/operator-action-logging.spec.ts
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
- Roles are enforced in route guards and in every operator callable, but not yet in Firestore rules (\#1078). Until those land, an account that cannot reach an operator _operation_ can still write documents directly.

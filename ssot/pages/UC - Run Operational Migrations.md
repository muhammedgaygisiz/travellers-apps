# UC - Run Operational Migrations

## Status

Supported today.

## Goal

BiteTribe Operators can run operational maintenance tasks from the admin app.

## Actors

- BiteTribe Operator, holding the `admin` role ([[User Roles]])

## Current Flow

- The operator signs into the admin app and lands on the dashboard, which
  lists one entry per migration.
- The operator opens the migration they came for and runs it. There is no
  combined migrations page: each migration is its own surface, so reaching one
  never means scrolling past the others (issue \#1473).
- **New version notification** announces a released app version to iPhone or
  Android users once the matching store serves the new build, and reports how
  far the announcement reached. See the Release Announcement Contract in
  [[UC - Receive App Notifications And Engagement Updates]].
- **Review timestamps backfill** starts the collection-wide rewrite and reads
  back what it did.
- **Menu item ids backfill** gives every stored category, menu item and variant
  the stable id an order line references, and reports how many of each it had
  to fill.
- **Bite address backfill**, **Restaurant clustering**, **Image migration** and
  **Geohash migration** each act on one Bite the operator picks from a table.

### Why this is not one page any more

It was one page in the business app, which put every migration in front of an
operator who wanted one of them, and put all of them in front of every
restaurant that signed in. Issue \#1473 moved them behind the `admin` role and
split them by what they do, so the dashboard names the operation rather than the
mechanism.

Registering a migration is therefore a name, a runner, its copy, **and its
dashboard entry**.

## Collection Migration Contract

The per-Bite migrations each take a target the operator picks from a table. A
collection-wide migration takes none: one press, and the callable walks the
collection itself.

- Every collection migration is idempotent, so a second press is safe and
  changes nothing that is already correct. That is what makes a plain button
  enough, with no confirmation step in front of it.
- A run reports counts, and the shared collection-migration card renders
  whatever counts it is given rather than markup written per migration. A rewrite leaves nothing on the page to
  look at, so pressing the button again must not be the only way to find out
  whether the first press worked — the same reasoning as the release
  announcement.
- A failure is shown on the page instead of being rethrown. The admin app is the
  only place these are triggered from, so a rejected call has nowhere else to
  surface.
- Each migration holds its own state, so one long run does not block starting
  another.
- Adding a migration means adding a name, its runner, its copy and its dashboard
  entry — not another copy of the state handling.

Registered today: `review-timestamps` ([[issue-1283]]) and `menu-item-ids`
(issue \#1099).

`menu-item-ids` is the second registration, and it is the first evidence that
the contract above holds: it added a name, a runner, its copy and its dashboard
entry, and no markup at all. The shared card renders its five counts without
knowing what a menu is.

Its idempotence carries more weight than most. An id that already exists is
never replaced, because replacing one would move the target of every order line
already pointing at it - see [[UC - Order At The Table Through A QR Code]].

### Why There Is No Display Name Backfill

`backfillDisplayNameClaimsCallable` existed and was removed rather than surfaced
here. It claimed every existing user's display name so uniqueness enforcement
could be switched on "with existing users protected", and that justification does
not hold:

- Nothing needs a claim to exist. `/displayNames` is read only by
  `claimDisplayName`, `checkDisplayNameAvailability`, and `deleteOwnAccount`
  releasing a claim. No route, search, or render depends on one.
- Unclaimed names are already protected. Both uniqueness checks scan `/users`
  for a matching `displayName`/`normalizedDisplayName` alongside the claim
  collection, so enforcement never needed the backfill to be switched on.
- Active users claim their own name. `onboardingGuard` gates every authenticated
  route on `onboardingCompletedAt`, which no pre-existing user has, so a
  returning user is routed through the assistant and `persistIdentityStep`
  claims for them.

What the backfill actually did was close a narrower gap: a legacy user has no
`normalizedDisplayName`, so only the exact case-sensitive scan matches them, and
a case variant of their name could be claimed by someone else. Closing it also
froze the names of accounts that may never return — squatting on behalf of
dormant users. Between protecting a dormant name forever and freeing it, the
decision is to free it. A returning user whose case variant was taken picks a new
name in onboarding.

## Supported Evidence

- `libs/bite-tribe-admin/migrations/{page,data-access}`, routed in the admin
  shell behind `authGuard` and `roleGuard('admin')`.
- `sendNewVersionNotification`.
- `backfillReviewTimestampsCallable`, started from the review-timestamps
  backfill surface.
- `backfillMenuItemIdsCallable`, started from the menu item ids backfill
  surface.

## Authorization

Every migration callable calls `requireAdmin` (issue \#1472). Moving the UI into
the admin app did not secure them: the callable runs with admin credentials, so
the only thing that stops a consumer account from posting a crafted payload to
it is the callable reading the role out of the verified token itself. The
classification of every endpoint lives in
`apps/bite-tribe-firebase/functions/src/__specs__/callable-authorization.spec.ts`,
which fails the build for a new one nobody has classified.

## Related Domains

- [[User]]
- [[Restaurant]]
- [[Bite]]

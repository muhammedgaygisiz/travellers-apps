# UC - Run Operational Migrations

## Status

Supported today.

## Goal

Admins or maintainers can run operational maintenance tasks from business tooling.

## Actors

- Admin
- Business maintainer

## Current Flow

- Admin opens the migrations page.
- Admin runs or supervises operational migration work.
- Admin announces a released app version to iPhone or Android users once the
  matching store serves the new build, and sees how far the announcement
  reached. See the Release Announcement Contract in
  [[UC - Receive App Notifications And Engagement Updates]].
- Admin starts a collection-wide migration and reads back what it did.

## Collection Migration Contract

The per-Bite actions on the migrations page each take a target the operator
picks from a table. A collection-wide migration takes none: one press, and the
callable walks the collection itself.

- Every collection migration is idempotent, so a second press is safe and
  changes nothing that is already correct. That is what makes a plain button
  enough, with no confirmation step in front of it.
- A run reports counts, and the page renders whatever counts it is given rather
  than markup written per migration. A rewrite leaves nothing on the page to
  look at, so pressing the button again must not be the only way to find out
  whether the first press worked — the same reasoning as the release
  announcement.
- A failure is shown on the page instead of being rethrown. This page is the
  only place these are triggered from, so a rejected call has nowhere else to
  surface.
- Each migration holds its own state, so one long run does not block starting
  another.
- Adding a migration means adding a name, its runner, and its copy — not another
  copy of the state handling.

Registered today: `review-timestamps` ([[issue-1283]]).

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

- Business `migrations`.
- `sendNewVersionNotification`.
- `backfillReviewTimestampsCallable`, started from the collection migrations
  table.

## Related Domains

- [[User]]
- [[Restaurant]]
- [[Bite]]

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

Registered today: `review-timestamps` ([[issue-1283]]) and
`display-name-claims`.

## Supported Evidence

- Business `migrations`.
- `sendNewVersionNotification`.
- `backfillReviewTimestampsCallable` and `backfillDisplayNameClaimsCallable`,
  both started from the collection migrations table.

## Related Domains

- [[User]]
- [[Restaurant]]
- [[Bite]]

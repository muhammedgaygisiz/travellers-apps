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

## Supported Evidence

- Business `migrations`.
- `sendNewVersionNotification`.

## Related Domains

- [[User]]
- [[Restaurant]]
- [[Bite]]

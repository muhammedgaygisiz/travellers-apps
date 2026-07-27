# UC - Manage Profile And Social Graph

## Status

Supported today.

## Goal

Users can maintain their identity and use profile/social context to build trust around food experiences.

## Actors

- User
- Bite creator
- Food lover

## Current Flow

- User views or edits their own profile.
- User opens public profiles.
- User follows or unfollows other users.
- User inspects followers and following.
- Profile identity is used in search and Bite trust context.
- Profile Bites are always listed newest first. The profile is a timeline of what
  a user cooked or ate, so it ignores the distance sorting and the my-bites
  filters. See [[issue-1118]].
- While a profile loads, the page shows a skeleton in the shape of the loaded
  profile instead of the field fallbacks. Placeholder values such as the FREE
  badge or "no location" must never be shown for a profile that has not arrived
  yet, because the user reads them as facts about that person. The
  "profile not available" message stays reserved for a profile that finished
  loading without data. See GitHub issue #1166.

## Supported Evidence

- `my-profile`
- `edit-profile`
- `profile/:userId`
- `followers/:userId/:type`
- Profile API.
- Public-user conversion.
- Playwright coverage for profile editing, public-profile navigation,
  follower/following lists, and follow/unfollow persistence.

## Related Domains

- [[User]]
- [[Bite]]

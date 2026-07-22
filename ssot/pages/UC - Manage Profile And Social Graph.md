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

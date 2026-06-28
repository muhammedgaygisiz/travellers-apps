# Implementation - Firebase Functions

## Purpose

Firebase Functions implement backend-owned behavior for search, notifications, auth-driven user creation, aggregate maintenance, storage post-processing, and scheduled engagement.

## Location

```text
apps/bite-tribe-firebase/functions/src/functions
apps/bite-tribe-firebase/functions/src/index.ts
```

## Current Function Areas

| Area           | Examples                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Auth           | `create-user-on-auth-create.ts`                                                                       |
| Search         | `search-bites.ts`, `search-restaurants.ts`, `search-users.ts`                                         |
| Discovery      | `load-bites-by-location.ts`, `load-leaderboard.ts`                                                    |
| Aggregates     | `increment-bite-count-on-bite-create.ts`                                                              |
| Storage        | `set-bite-image-path-on-upload.ts`                                                                    |
| Notifications  | `notify-bite-creator-on-like.ts`, `notify-followers-on-new-bite.ts`, `notify-user-on-new-follower.ts` |
| Scheduled jobs | `send-weekly-bite-notification.ts`                                                                    |
| Deep links     | `handle-shared-link-to-bite.ts`                                                                       |

## Implementation Rules

- Put backend-owned query semantics in functions when the client should not duplicate filtering logic.
- Keep callable request and result shapes typed.
- Preserve client-safe fallback behavior where the UI expects empty lists instead of hard failures.
- Add structured logs for operationally important branches.
- Export new functions from `src/index.ts`.

## Validation

From `apps/bite-tribe-firebase/functions`:

```bash
npm run build
npm run lint
```

Use focused function tests when they exist for the changed callable or trigger.

## Related Pages

- [[Architecture - Firebase]]
- [[Implementation - Testing]]

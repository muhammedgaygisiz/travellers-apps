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
| Auth           | `create-user-on-auth-create.ts`, `update-last-seen.ts`, `update-user-metadata.ts`                     |
| Search         | `search-bites.ts`, `search-restaurants.ts`, `search-users.ts`                                         |
| Discovery      | `load-bites-by-location.ts`, `load-leaderboard.ts`                                                    |
| Enrichment     | `enrich-bite-address-on-create.ts`                                                                    |
| Aggregates     | `increment-bite-count-on-bite-create.ts`, `update-bite-like-count-on-like-write.ts`                   |
| Storage        | `set-bite-image-path-on-upload.ts`                                                                    |
| Notifications  | `notify-bite-creator-on-like.ts`, `notify-followers-on-new-bite.ts`, `notify-user-on-new-follower.ts` |
| Scheduled jobs | `send-weekly-bite-notification.ts`                                                                    |
| Deep links     | `handle-shared-link-to-bite.ts`                                                                       |

## Implementation Rules

- Put backend-owned query semantics in functions when the client should not duplicate filtering logic.
- Keep callable request and result shapes typed.
- Use `onAppCheck` from `callable-options.ts` for frontend callable functions so App Check enforcement is applied consistently.
- Preserve client-safe fallback behavior where the UI expects empty lists instead of hard failures.
- Add structured logs for operationally important branches.
- Export new functions from `src/index.ts`.
- Backend-only third-party API keys should live in the functions runtime environment; Bite address enrichment expects `GOOGLE_GEOCODING_API_KEY`.
- Use the `bite-tribe-firebase:firebase-set-geocoding-secret` Nx target to set the production Google Geocoding secret before deploying functions that bind it; the target prompts for the secret value at execution time and must not store the value in `project.json`.
- Trigger-maintained counters must handle every lifecycle path that can change the count. If the counted entity can be deleted, add a matching delete-side decrement trigger when the create path increments.
- Trigger-maintained Bite like aggregates must migrate old Bite documents that are missing `thumbup`, `drooling`, or `mindblown` by recomputing counts from the `likes` subcollection before using increment/decrement deltas.

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

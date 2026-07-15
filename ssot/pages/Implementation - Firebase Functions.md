# Implementation - Firebase Functions

## Purpose

Firebase Functions implement backend-owned behavior for search, notifications, auth-driven user creation, aggregate maintenance, storage post-processing, and scheduled engagement.

## Location

```text
apps/bite-tribe-firebase/functions/src/functions
apps/bite-tribe-firebase/functions/src/index.ts
```

## Current Function Areas

| Area           | Examples                                                                                                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `create-user-on-auth-create.ts`, `update-last-seen.ts`, `update-user-metadata.ts`, `sync-email-verification-status.ts`, `resend-email-verification.ts`, `claim-display-name.ts`, `check-display-name-availability.ts`, `backfill-display-name-claims.ts` |
| Search         | `search-bites.ts`, `search-bites-by-city.ts`, `search-restaurants.ts`, `search-users.ts`, `search-places.ts`                                                                                                                                             |
| Discovery      | `load-bites-by-location.ts`, `load-leaderboard.ts`                                                                                                                                                                                                       |
| Enrichment     | `enrich-bite-address-on-create.ts`, `backfillBiteAddress`, `get-currency-by-position.ts`                                                                                                                                                                 |
| Aggregates     | `increment-bite-count-on-bite-create.ts`, `resync-bite-counts.ts`, `update-bite-like-count-on-like-write.ts`                                                                                                                                             |
| Storage        | `set-bite-image-path-on-upload.ts`                                                                                                                                                                                                                       |
| Notifications  | `notify-bite-creator-on-like.ts`, `notify-followers-on-new-bite.ts`, `notify-user-on-new-follower.ts`, `send-daily-leaderboard-notification.ts`                                                                                                          |
| Restaurants    | `cluster-restaurant-candidate-for-bite.ts`, `create-restaurant-candidate-on-bite-create.ts`, `verify-restaurant-candidate.ts`                                                                                                                            |
| Scheduled jobs | `send-weekly-bite-notification.ts`, `send-email-verification-reminders.ts`                                                                                                                                                                               |
| Deep links     | `handle-shared-link-to-bite.ts`                                                                                                                                                                                                                          |

## Implementation Rules

- Put backend-owned query semantics in functions when the client should not duplicate filtering logic.
- Keep callable request and result shapes typed.
- Use `onAppCheck` from `callable-options.ts` for frontend callable functions so App Check enforcement is applied consistently. `onAppCheck` keeps enforcement enabled by default and disables it only when the Functions emulator sets `FUNCTIONS_EMULATOR=true`.
- Preserve client-safe fallback behavior where the UI expects empty lists instead of hard failures.
- Add structured logs for operationally important branches.
- Export new functions from `src/index.ts`.
- Backend-only third-party API keys should live in the functions runtime environment; Bite address enrichment expects `GOOGLE_GEOCODING_API_KEY`.
- Use the `bite-tribe-firebase:firebase-set-geocoding-secret` Nx target to set the production Google Geocoding secret before deploying functions that bind it; the target prompts for the secret value at execution time and must not store the value in `project.json`.
- Migration callables that can invoke paid APIs should operate on explicit records, such as a selected `biteId`, so operators can repeat the migration deliberately without broad accidental API usage.
- Restaurant candidate verification must keep the state transition backend-owned: create the Restaurant, create the Menu, link candidate Bites, and mark the candidate verified in one transaction.
- Candidate verification must be idempotent for already verified or merged candidates and return the existing `verifiedRestaurantId` rather than creating duplicates.
- Trigger-maintained counters must handle every lifecycle path that can change the count. If the counted entity can be deleted, add a matching delete-side decrement trigger when the create path increments.
- Trigger-maintained Bite like aggregates must migrate old Bite documents that are missing `thumbup`, `drooling`, or `mindblown` by recomputing counts from the `likes` subcollection before using increment/decrement deltas.
- Automatic restaurant-candidate detection (`create-restaurant-candidate-on-bite-create.ts`) only fires for Bites without a verified `restaurantId`, requires at least `5` matching nearby unverified Bites within `200m`, skips creation when a nearby verified restaurant matches, updates a nearby pending candidate instead of duplicating, and never writes back to Bite documents. Reuse the shared clustering helpers in `utils/restaurant-candidate-store.ts` and `utils/restaurant-candidates.ts` rather than duplicating query, matching, or candidate-build logic across the manual callable and the trigger.
- Email verification callables must use Firebase Admin Auth as the source of truth and mirror only derived metadata to `/users/{uid}`. Manual resend requests are throttled for one hour. Automatic reminders run monthly at 10:00 Europe/Zurich, stop after three successful sends, and exclude accounts that have trusted Google or Apple provider links.
- Email verification delivery uses Firebase Admin verification links and the Google Workspace/Gmail API credentials from the functions runtime environment: `GOOGLE_WORKSPACE_CLIENT_EMAIL`, `GOOGLE_WORKSPACE_PRIVATE_KEY`, and `GOOGLE_WORKSPACE_DELEGATED_USER`.
- Display name uniqueness is backend-owned. `claimDisplayName` normalizes the name (trim + lowercase), then writes a `/displayNames/{normalizedName}` claim document inside a transaction so concurrent claims of the same normalized name cannot both succeed; the same transaction releases the caller's previous claim on rename and keeps `/users/{uid}.displayName` and `normalizedDisplayName` consistent. `checkDisplayNameAvailability` is a read-only advisory check that treats a name already owned by the caller as available. `backfillDisplayNameClaimsCallable` claims existing users' names oldest-first (`createdAtTimestamp` ascending) so the first-registered user keeps the name on a normalization collision, is idempotent for already-owned claims, and logs collisions. Reuse `normalizeDisplayName`/`isValidNormalizedDisplayName` from `users/display-name-utils.ts` rather than re-implementing normalization. Emulator specs (`display-name-claims.emulator-spec.ts`) cover concurrent claims, rename/release, and backfill.

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

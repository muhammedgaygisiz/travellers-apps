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
| Discovery      | `load-bites-by-location.ts`, `load-leaderboard.ts`, `load-weekly-bites.ts`                                                                                                                                                                               |
| Enrichment     | `enrich-bite-address-on-create.ts`, `backfillBiteAddress`, `get-currency-by-position.ts`                                                                                                                                                                 |
| Aggregates     | `increment-bite-count-on-bite-create.ts`, `resync-bite-counts.ts`, `update-bite-like-count-on-like-write.ts`, `update-follow-counts-on-follow-write.ts`, `resync-follow-counts.ts`                                                                       |
| Storage        | `set-bite-image-path-on-upload.ts`                                                                                                                                                                                                                       |
| Notifications  | `notify-bite-creator-on-like.ts`, `notify-bite-creator-on-review.ts`, `notify-followers-on-new-bite.ts`, `notify-user-on-new-follower.ts`, `send-daily-leaderboard-notification.ts`, `shared/utils/send-localized-notification.ts`, `shared/i18n`        |
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
- Engagement notification copy is localized in the backend. A push notification is rendered by the OS before the app runs, so Transloco can never reach it; the catalog in `shared/i18n` is the backend equivalent of the app's locale files. Senders name a message key, never an English sentence, and `sendLocalizedNotification` resolves each recipient's language from `settings/{uid}.language`, groups the enabled tokens per language, and sends one multicast per language. An account without settings, with an unsupported language, or with a regional locale such as `de-CH` falls back to the base language and then to `en`; a notification in the wrong language still beats no notification. Adding a language to `SUPPORTED_LANGUAGES` without its catalog fails the build. See issue \#1200.
- Every notification trigger sends through `shared/utils/send-localized-notification.ts`. Localization, chunking, and invalid-token cleanup live there so a new trigger cannot quietly ship English or skip the cleanup contract.
- Engagement notifications that link into the app must carry the data their landing page needs. The weekly summary sends the `weekStart`/`weekEnd` bounds it counted so `loadWeeklyBites` can serve exactly that week; requests without a usable range fall back to the previous calendar week. Week bounds live in `shared/utils/week-bounds.ts` and must not be re-derived per function.
- Migration callables that can invoke paid APIs should operate on explicit records, such as a selected `biteId`, so operators can repeat the migration deliberately without broad accidental API usage.
- Restaurant candidate verification must keep the state transition backend-owned: create the Restaurant, create the Menu, link candidate Bites, and mark the candidate verified in one transaction.
- Candidate verification must be idempotent for already verified or merged candidates and return the existing `verifiedRestaurantId` rather than creating duplicates.
- Trigger-maintained counters must handle every lifecycle path that can change the count. If the counted entity can be deleted, add a matching delete-side decrement trigger when the create path increments.
- Trigger-maintained Bite like aggregates must migrate old Bite documents that are missing `thumbup`, `drooling`, or `mindblown` by recomputing counts from the `likes` subcollection before using increment/decrement deltas.
- Trigger-maintained aggregates are eventually consistent, so a client that also writes the counted document optimistically must not render the aggregate alone. The reaction counter takes the higher of the Bite aggregate and the likes the client already loaded; see [[Bite]] and issue \#1165.
- Trigger-maintained user follow aggregates (`followersCount`, `followingCount`) must migrate user documents that predate the aggregate by recomputing the count from the `followers`/`following` subcollection before applying increment/decrement deltas, so existing users are not corrupted by a blind increment. The scheduled `resyncFollowCounts` backfills and corrects drift for users that never receive a follow write, mirroring `resyncBiteCounts`.
- Automatic restaurant-candidate detection (`create-restaurant-candidate-on-bite-create.ts`) only fires for Bites without a verified `restaurantId`, requires at least `5` matching nearby unverified Bites within `200m`, skips creation when a nearby verified restaurant matches, updates a nearby pending candidate instead of duplicating, and never writes back to Bite documents. Reuse the shared clustering helpers in `utils/restaurant-candidate-store.ts` and `utils/restaurant-candidates.ts` rather than duplicating query, matching, or candidate-build logic across the manual callable and the trigger.
- Email verification callables must use Firebase Admin Auth as the source of truth and mirror only derived metadata to `/users/{uid}`. Manual resend requests are throttled for one hour. Automatic reminders run monthly at 10:00 Europe/Zurich, stop after three successful sends, and exclude accounts that have trusted Google or Apple provider links.
- Email verification delivery uses Firebase Admin verification links and the Google Workspace/Gmail API credentials from the functions runtime environment: `GOOGLE_WORKSPACE_CLIENT_EMAIL`, `GOOGLE_WORKSPACE_PRIVATE_KEY`, and `GOOGLE_WORKSPACE_DELEGATED_USER`.
- Display name uniqueness is backend-owned. `claimDisplayName` normalizes the name (trim + lowercase), then writes a `/displayNames/{normalizedName}` claim document inside a transaction so concurrent claims of the same normalized name cannot both succeed; the same transaction releases the caller's previous claim on rename and keeps `/users/{uid}.displayName` and `normalizedDisplayName` consistent. `checkDisplayNameAvailability` is a read-only advisory check that treats a name already owned by the caller as available. `backfillDisplayNameClaimsCallable` claims existing users' names oldest-first (`createdAtTimestamp` ascending) so the first-registered user keeps the name on a normalization collision, is idempotent for already-owned claims, and logs collisions. Reuse `normalizeDisplayName`/`isValidNormalizedDisplayName` from `users/display-name-utils.ts` rather than re-implementing normalization. Emulator specs (`display-name-claims.emulator-spec.ts`) cover concurrent claims, rename/release, and backfill.
- Account deletion is backend-owned. `deleteOwnAccount` proves the sign-in is recent from `request.auth.token.auth_time` (five minutes) rather than relying on Firebase's client-side recent-login rule, because the cascade runs with admin privileges; a stale token returns `failed-precondition`/`reauth_required` so the app can re-authenticate and retry. Progress is recorded in `/accountDeletions/{uid}` and an already completed job returns immediately, so a retried call is a no-op. Data is removed before the Firebase Auth account, never after, so a failure leaves a signed-in user who can retry rather than an unreachable data set. A deletion that keeps content alive must also refresh anything cached about the user: this one prunes `/meta/leaderboardDaily` and calls `rebuildLeaderboard`, because those snapshots hold display names and emails and are otherwise only rebuilt by a Bite create or delete. The per-category contract is in [[UC - Use Account And Legal Flows]].

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

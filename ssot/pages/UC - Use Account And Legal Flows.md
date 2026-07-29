# UC - Use Account And Legal Flows

## Status

Supported today.

## Goal

Users can access legal and account lifecycle information.

## Actors

- User
- Privacy-conscious participant

## Current Flow

- User opens the privacy policy from the About page, or from the public `/privacy` route.
- User opens account deletion from the Account section at the bottom of the settings page.
- The delete-account page names what is removed and what is kept, then asks for an explicit destructive confirmation.
- The `deleteOwnAccount` callable rejects a sign-in older than five minutes with `reauth_required`; the app re-runs the account's own sign-in method (Google, Apple, or a password prompt) and retries once.
- The backend removes the user-owned data, then deletes the Firebase Auth account last, and the app signs the user out.
- The public `/account-deletion` route stays reachable without signing in for store review. It documents the in-app flow and keeps an email fallback for users who can no longer sign in.
- Email/password user sees a non-blocking email verification prompt on home, settings, and profile edit when verification is still required.
- User can request a fresh verification email from the prompt; backend throttling prevents repeated manual sends within one hour.
- Backend sends monthly automatic verification reminders at 10:00 Europe/Zurich until the configured reminder limit is reached.

## Deletion Contract

Each user-owned data category is handled deliberately. See [[issue-1182]] for the reasoning and [[User]] for the paths.

- Removed: public profile and its follow and push-token subcollections, the mirrored follow edge on other users, the display-name claim, settings, reviews, likes given, bucket lists, BiteTrail ratings, profile images, and the Firebase Auth account.
- Kept with the identifier cleared: Bites (the Bite and its image stay, `userId` is removed) and BiteTrail purchase records (the document stays so the seller's `soldCount` holds).
- Kept untouched: restaurants, menus and restaurant candidates, which are shared place data.
- Cannot be removed in band: analytics and Crashlytics data already keyed to the uid. The in-app copy says so.

The cascade also prunes the deleted user from `/meta/leaderboardDaily` and rebuilds `/meta/leaderboard`, because those snapshots cache display names and emails and are otherwise only rebuilt by a Bite create or delete.

## Supported Evidence

- `privacy`
- `account-deletion`
- `settings/delete-account`
- `deleteOwnAccount`
- `resendEmailVerification`
- `syncEmailVerificationStatus`
- `sendEmailVerificationReminders`
- `apps/bite-tribe-e2e/src/tests/account-and-legal.spec.ts` covers in-app privacy navigation, deletion cancellation, and the completed emulator-backed cascade with a retained anonymized Bite.

## Related Domains

- [[User]]

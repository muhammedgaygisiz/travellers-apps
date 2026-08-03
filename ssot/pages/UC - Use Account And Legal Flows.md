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
- The privacy policy is shown in the selected app language when that language has a reviewed policy, and in English otherwise. English and German are reviewed today. Both entry points share the same component, so the in-app and web routes resolve the language identically.
- A user whose app language has no reviewed policy is told so on the page, in their own app language, above the English document. The policy language is never switched silently.
- User opens account deletion from the Account section at the bottom of the settings page.
- The delete-account page names what is removed and what is kept, then asks for an explicit destructive confirmation.
- The `deleteOwnAccount` callable rejects a sign-in older than five minutes with `reauth_required`; the app re-runs the account's own sign-in method (Google, Apple, or a password prompt) and retries once.
- The backend removes the user-owned data, then deletes the Firebase Auth account last, and the app signs the user out.
- The public `/account-deletion` route stays reachable without signing in for store review. It documents the in-app flow and keeps an email fallback for users who can no longer sign in.
- Email/password user sees a non-blocking email verification prompt on home, settings, and profile edit when verification is still required.
- User can request a fresh verification email from the prompt; backend throttling prevents repeated manual sends within one hour.
- The resend action reports itself: the button shows a spinner with a sending label and is disabled while the callable is in flight, a second tap is ignored, and the outcome always raises a localized toast for success, one-hour throttling, an already-verified address, an unsupported provider, or a generic failure. The button returns to its idle state on every outcome, so a recoverable failure stays retryable.
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
- `libs/bite-tribe/privacy-policy/src/lib/privacy-policy/__specs__` covers the policy language contract: the German app renders the German policy, an app language without a reviewed policy renders the English one with the disclosed notice, and a late language preference rebuilds the document.

## Policy Language Contract

See [[issue-1218]] for the reasoning.

- `REVIEWED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy` is the published set. A language belongs there only once its policy copy exists in that locale file and has been reviewed for equivalent legal coverage.
- Everything outside that set - including an unknown or missing app language - resolves to English and reports the fallback, so the page can disclose it.
- Regional tags resolve to their base language: `de-CH` gets the German policy.

## Related Domains

- [[User]]

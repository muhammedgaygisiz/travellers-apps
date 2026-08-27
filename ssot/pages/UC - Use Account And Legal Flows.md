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
- The privacy policy is shown in the selected app language. It is published in all eleven app languages, and both entry points share the same component, so the in-app and web routes resolve the language identically.
- A language without published policy copy - a locale added to the app before its policy is written - falls back to the English document and is told so on the page, in its own app language. The policy language is never switched silently.
- User opens account deletion from the Account section at the bottom of the settings page.
- The delete-account page names the signed-in account first - avatar, display name, email and sign-in method - then what is removed and what is kept, then asks for an explicit destructive confirmation that repeats the account.
- The `deleteOwnAccount` callable rejects a sign-in older than five minutes with `reauth_required`; the app re-runs the account's own sign-in method (Google, Apple, or a password prompt) and retries once. The password prompt names the account it belongs to and says why it appeared, and a refused re-authentication is reported as such rather than as a generic failure the user is invited to repeat.
- The backend removes the user-owned data, then deletes the Firebase Auth account last, and the app signs the user out.
- The public `/account-deletion` route stays reachable without signing in for store review. It documents the in-app flow and keeps an email fallback for users who can no longer sign in.
- Email/password user sees a non-blocking email verification prompt on home, settings, and profile edit when verification is still required.
- User can request a fresh verification email from the prompt; backend throttling prevents repeated manual sends within one hour.
- The resend action reports itself: the button shows a spinner with a sending label and is disabled while the callable is in flight, a second tap is ignored, and the outcome always raises a localized toast for success, one-hour throttling, an already-verified address, an unsupported provider, or a generic failure. The button returns to its idle state on every outcome, so a recoverable failure stays retryable.
- Backend sends monthly automatic verification reminders at 10:00 Europe/Zurich until the configured reminder limit is reached.

## Account Identity Contract

See [[issue-1234]] for the reasoning.

- A deletion is only offered against an account the page has named. Without a signed-in account the page says so and the destructive action stays disabled.
- The identity is non-secret: profile photo, display name, email, and the sign-in method. The uid is never shown, and no credential ever is.
- A provider that withholds the email - Apple with a hidden address - is identified by display name and sign-in method instead, so the three supported methods each stay distinguishable.
- The shown identity follows the auth session rather than a value read once when the page opened, so a session that changes underneath the page changes what is shown.
- The deletion re-reads the signed-in account and refuses to run when it is no longer the confirmed one; the page reports the refusal instead of a failure. The same check runs again after a provider sheet re-authenticates, because that sheet lets the user pick a different account.
- Profile name and photo come from the profile document, but only when it belongs to the signed-in uid; the auth user is the only source for uid, email, and sign-in method.

## Re-Authentication Contract

See [[issue-1385]] for the reasoning.

- The sign-in method is read from the first `providerData` entry that is not Firebase's own reserved `firebase` record. The Android SDK includes that record and the web and iOS SDKs do not, so reading the list positionally identified every Android account as unknown and made deletion unreachable for them.
- Only Google and Apple refresh a sign-in through their own sheet. Every other provider - including one the app does not recognise - is answered with the password prompt, because a sign-in sheet that does not exist can only fail, and failing there leaves the user with no route to a deletion the law requires.
- The re-authentication is asked for when the backend rejects the session, not before it. A fresh session needs nothing, and charging the common case for the rare one would put a password prompt in front of every deletion.

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
- `libs/bite-tribe/privacy-policy/src/lib/privacy-policy/__specs__` covers the policy language contract: German and Turkish apps render their own policy, a language without published policy copy renders the English one with the disclosed notice in its own language, and a late language preference rebuilds the document.

## Policy Language Contract

See [[issue-1218]] for the reasoning.

- `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy` is the published set. A language belongs there only once its policy copy exists in that locale file with legal coverage equivalent to the English original. It currently matches `availableLangs` and has to be extended with it.
- Everything outside that set - including an unknown or missing app language - resolves to English and reports the fallback, so the page can disclose it. This is what keeps a newly added locale from rendering raw keys inside a legal document.
- Regional tags resolve to their base language: `de-CH` gets the German policy.
- The policy translations outside English and German have not been through a human legal review yet.

## Related Domains

- [[User]]

# UC - Use Account And Legal Flows

## Status

**Level:** L0.
Supported today. The privacy policy and its language fallback, in-app account deletion
with re-authentication and the full data cascade, the public `/account-deletion` route,
the email verification prompt with its throttled manual resend, and the monthly reminder
job all ship. The contracts below hold the detail: what the cascade leaves behind is
`Deletion Contract`'s fact, and the state of the policy translations is
`Policy Language Contract`'s.

## Goal

Any account can read the legal terms it is subject to and end its own participation from
inside the app, without asking anyone and without depending on an account it can still
sign into - the guarantee the privacy-conscious participant is looking for, and the one
both stores require be reachable. This page owns the privacy policy's entry points and
language resolution, the account deletion flow and what deletion does to each category of
data, and email verification.

## Actors

- **Bite Creator** - reads the privacy policy, deletes its own account, and verifies its
  email address.
- **Restaurant Staff** - acts no differently here, but is named because the account it
  deletes carries a staff association the cascade has to remove with it.
- **Restaurant Owner** - acts no differently here, but is named because a restaurant it
  holds records its account on the restaurant document, which outlives the deletion.

## Flow

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

- Removed: public profile and its follow and push-token subcollections, the mirrored follow edge on other users, the display-name claim, settings, reviews, likes given, bucket lists, BiteTrail ratings, profile images, the staff association at `/restaurantStaff/{uid}` if the account works at a restaurant (\#1537), and the Firebase Auth account.
- Kept with the identifier cleared: Bites (the Bite and its image stay, `userId` is removed) and BiteTrail purchase records (the document stays so the seller's `soldCount` holds).
- Kept untouched: restaurants, menus and restaurant candidates, which are shared place data.
- Cannot be removed in band: analytics and Crashlytics data already keyed to the uid. The in-app copy says so.
- Not decided yet, each owned by its own issue: a restaurant's ownership fields, which stay on the restaurant carrying the deleted account's uid (\#1568); a BiteTrail the account owns, which falls into none of the categories above (\#1569); and the job record at `/accountDeletions/{uid}`, which survives the account it names and has no stated retention (\#1570).

The cascade also prunes the deleted user from `/meta/leaderboardDaily` and rebuilds `/meta/leaderboard`, because those snapshots cache display names and emails and are otherwise only rebuilt by a Bite create or delete.

## Policy Language Contract

See [[issue-1218]] for the reasoning.

- `PUBLISHED_PRIVACY_POLICY_LANGUAGES` in `libs/bite-tribe/privacy-policy` is the published set. A language belongs there only once its policy copy exists in that locale file with legal coverage equivalent to the English original. It currently matches `availableLangs` and has to be extended with it.
- Everything outside that set - including an unknown or missing app language - resolves to English and reports the fallback, so the page can disclose it. This is what keeps a newly added locale from rendering raw keys inside a legal document.
- Regional tags resolve to their base language: `de-CH` gets the German policy.
- The policy translations outside English and German have not been through a human legal review yet.

## MVP Classification

**[MVP]** - the privacy policy with its language fallback and both entry points, in-app
account deletion end to end, and the public `/account-deletion` route. Apple requires the
in-app path and Google requires the web link, so neither is a candidate for a later
release.

**[Secondary]** - the monthly automatic reminder job. The verification prompt and the
manual resend stay `[MVP]`, because an email/password account that never received its
first verification mail has no other way back; the job only shortens how long that takes.

## App Store Review Area

Relevant, and exercised more directly than on any other page.

- Apple `5.1.1(v)`: an app that supports account creation must offer account deletion
  within the app. `settings/delete-account` is that offer.
- Google Play's data-deletion policy wants both an in-app path and a web link at which
  deletion can be requested, the link declared in the Data safety form. The public
  `/account-deletion` route is that link, which is why it has to stay reachable without a
  sign-in and after the app is uninstalled.
- Apple `5.1.1(i)`: the privacy policy must be linked in App Store Connect metadata _and_
  reachable inside the app, and must explain the data retention and deletion policy. The
  entry point from About and the public `/privacy` route answer the first half; the second
  half is only as good as `Deletion Contract`, because a category that contract does not
  decide is a category the policy cannot describe.
- The categories the cascade removes, keeps, or cannot reach have to agree with the data
  types declared in [[Implementation - Store Declarations]].

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

## Related Domains

- [[User]]

## Related Pages

- [[Personas]] - the audiences this page serves: the privacy-conscious participant the
  deletion guarantee exists for, and the new user who meets the verification prompt
- [[UC - Own And Claim Restaurants]] - where a restaurant's ownership fields are written
- [[Implementation - Store Declarations]] - the declared data types the deletion contract
  has to agree with
- [[issue-1182]]
- [[issue-1218]]
- [[issue-1234]]
- [[issue-1385]]

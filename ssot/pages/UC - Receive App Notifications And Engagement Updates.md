# UC - Receive App Notifications And Engagement Updates

## Status

Supported today.

## Goal

Users and creators can receive engagement signals around Bites and social activity.

## Actors

- Bite creator
- User
- Food lover

## Current Flow

- Backend functions react to new Bites, likes, reviews, followers, and weekly activity.
- Backend functions can notify users about meaningful leaderboard ranking changes.
- Notifications or shared-link behavior keep users connected to activity.
- Tapping a notification opens the surface it talks about: the Bite, the follower profile, the leaderboard, or the weekly bites page.
- The weekly summary counts one calendar week (Monday to Sunday, Europe/Zurich) and carries those bounds, so its landing page lists the Bites of exactly that week even when the user opens it days later.
- Notification text arrives in the language the user chose in settings, not in English.
- Users learn that a new app version is live from a notification, instead of waiting for TestFlight or Google Play to auto-update them.
- A Bite in a country the user has never covered congratulates them on the new country badge, and tells their followers when the profile is public.

## Notification Navigation Contract

Issue [#1244](https://github.com/muhammedgaygisiz/travellers-apps/issues/1244)
made a tapped notification reliably open its own surface:

- A tap opens the surface the notification is about, whether the app was
  already open, backgrounded, or had to start from cold. Landing on Home is a
  failure, not a fallback.
- A tap that launched the app arrives mid-startup, before the app has decided
  where a returning user belongs. The target is therefore held, not navigated:
  first until startup navigation is released, then until the redirect chain it
  starts has come to rest. Only then is one navigation issued.
- Startup navigation resolves the address the app was launched at, which for a
  signed-in user is Home. It is the last navigation issued during startup, so
  anything routed before it is discarded — which is why a target may not be
  navigated on arrival.
- Both waits are bounded. A startup that never settles opens the target anyway
  rather than swallowing the tap without trace.
- One tap produces one navigation. Two notifications tapped during the same
  startup open only the later surface, because the user asked for that one and
  the first would only be passed through.
- A payload naming a type the app does not route, or missing the id its route
  needs, leaves the user where they are. Guessing a surface the notification
  never mentioned is worse than not moving.
- Route guards still decide. The target goes through the router, so incomplete
  onboarding or a lost session redirects a tapped notification exactly as it
  would redirect the same route reached by hand.

## Localization Contract

Issue [#1200](https://github.com/muhammedgaygisiz/travellers-apps/issues/1200)
made notification copy follow the recipient:

- The language of a notification is the `language` the user saved in settings -
  the same choice the settings page shows them.
- The OS renders a push notification before the app runs, so the copy is
  translated in the backend when it is sent, not in the app when it arrives.
- Every installation of an account receives the same language, because language
  is an account preference while delivery is per installation.
- One trigger can go out in several languages at once: followers of the same
  Bite each read it in their own.
- An account that never chose a language, or chose one the app no longer offers,
  receives English rather than nothing.

## Release Announcement Contract

Issue [#1194](https://github.com/muhammedgaygisiz/travellers-apps/issues/1194)
added a manually triggered notification for a released app version:

- The trigger is manual. Nothing observable tells the backend when a TestFlight
  build or a Play Console review has actually gone live, so an operator fires it
  from the business migrations page once the store serves the new build.
- iOS and Android are announced separately, because the two stores clear their
  review at different times.
- The announcement is addressed by installation platform, not by account: the
  same user can have an iPhone and an Android phone registered, and only the
  installation whose store already serves the release is told to update.
- An installation whose `platform` was never recorded receives nothing, because
  guessing would announce an App Store release to an Android device.
- The copy still follows the Localization Contract: every recipient reads it in
  the language they chose.
- The business page reports how far the announcement reached, since a broadcast
  leaves nothing else behind to verify it by.

## Country Badge Contract

Issue [#1212](https://github.com/muhammedgaygisiz/travellers-apps/issues/1212)
turned the profile's country badges into an engagement signal:

- The trigger is the badge, not the Bite. A country that enters a profile's
  `countryCodes` list for the first time is congratulated; every later Bite in
  the same country is silent, because only the first one is an achievement.
- Followers of a public profile are told about the achievement, so a badge is
  recognition in front of an audience rather than a private counter. That is
  what the feature is for on the follower side: the same motivation, borrowed.
- A private profile is congratulated but never announced. Followers of a
  private account see none of its activity anywhere else in the app, and a
  badge notification must not become the one place that leaks where someone has
  been.
- A tap opens the profile that carries the badge - their own for the achiever,
  the achiever's for a follower.
- The country is named in the recipient's language, following the Localization
  Contract. ICU supplies the country name from the same language the sentence is
  written in, so the catalog carries the sentence and not 200 country names per
  locale. The flag emoji travels with the name as one value, so a locale decides
  where the whole badge goes in its sentence.
- The one-time backfill that gave existing profiles their badge list stays
  silent. It reconstructs a history the user already lived through, so it is a
  migration, not an achievement.
- A new account starts with an empty badge list rather than no list at all, so
  its first Bite reads as a first country earned instead of as the
  never-ran-before signal that triggers the backfill.
- A failing send never marks the Bite's address as unresolved. Awarding the
  badge happens after the address is written and is contained on its own.

## Review Thread Contract

Issue [#1283](https://github.com/muhammedgaygisiz/travellers-apps/issues/1283)
extends review notifications from one recipient to a conversation. Implemented by
`notifyThreadParticipantsOnReviewReply`.

- A reply notifies everyone already in that thread except the person who just
  wrote it: the root review author, every reply author, and the Bite creator.
  Being in the conversation is what makes someone a recipient, not owning the
  Bite.
- A participant is notified once per reply however many messages they have in the
  thread, so joining a conversation early is not punished with duplicates.
- A new root review is a new conversation. It notifies the Bite creator alone,
  exactly as `notifyBiteCreatorOnReview` does today, and reaches no participant of
  any other thread on the same Bite. This is the one rule the issue stated
  outright, and it is the reason a reply cannot simply reuse the existing trigger.
- A reply carries its own type, `NEW_REVIEW_REPLY`, with its own copy. The
  existing `NEW_BITE_REVIEW` text says "X reviewed your Bite", which is false for
  every recipient who is a reviewer rather than the creator.
- A participant whose review predates the `authorId` field is unreachable and is
  skipped. The rest of the fan-out still goes out; one unattributable document
  does not silence a conversation.
- A creator replying on their own Bite triggers no self-notification, consistent
  with the existing review and like triggers.
- A tap opens the Bite with the thread expanded and highlighted, so the payload
  carries `threadId` alongside `biteId`. Under the Notification Navigation
  Contract a payload missing the id its route needs leaves the user where they
  are.
- The copy follows the Localization Contract, so `newReviewReply` keys are added
  to every catalog rather than to English alone.

## Installation Contract

Issue [#1184](https://github.com/muhammedgaygisiz/travellers-apps/issues/1184)
made notification delivery installation-specific:

- An FCM token is a delivery address for one signed-in user and app
  installation.
- A persistent installation UUID identifies the app installation across FCM
  token rotations; it is not a hardware identifier and naturally changes after
  reinstall.
- Each installation's token has its own `enabled` delivery state.
- Disabling one installation does not affect another installation on the same
  account.
- Login, app restart, metadata refresh, and token rotation preserve a disabled
  state instead of writing `enabled: true`.
- Token rotation transfers the installation's state and removes the superseded
  token and reverse index.
- OS permission controls whether the current device may receive notifications;
  BiteTribe's token state controls whether the backend sends to that
  installation. Both states must remain visible and distinct.
- An installation's token state is manageable from any signed-in surface, not
  only from the installation itself. OS permission gates registering the
  current device, never the management of the others.
- `Settings.pushNotifications` is not part of delivery eligibility.

## Supported Evidence

- `notifyFollowersOnNewBite`
- `notifyBiteCreatorOnLike`
- `notifyBiteCreatorOnReview`, which returns early for a reply
- `notifyThreadParticipantsOnReviewReply`
- `notifyUserOnNewFollower`
- `sendWeeklyBiteNotification`
- `sendDailyLeaderboardNotification`
- `sendNewVersionNotification`, triggered from the business `migrations` page
- `notifyOnNewCountryBadge`, awarded from `enrichBiteAddressOnCreate`
- `handleSharedLinkToBite`
- `loadWeeklyBites`
- `sendLocalizedNotification` and the notification catalog in
  `apps/bite-tribe-firebase/functions/src/functions/shared/i18n`
- `weekly-bites` route, served by `WeeklyBitesContainer` in `libs/bite-tribe/home/page`

## Related Domains

- [[User]]
- [[Bite]]

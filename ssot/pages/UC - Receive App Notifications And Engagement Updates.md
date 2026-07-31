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
- `notifyBiteCreatorOnReview`
- `notifyUserOnNewFollower`
- `sendWeeklyBiteNotification`
- `sendDailyLeaderboardNotification`
- `handleSharedLinkToBite`
- `loadWeeklyBites`
- `sendLocalizedNotification` and the notification catalog in
  `apps/bite-tribe-firebase/functions/src/functions/shared/i18n`
- `weekly-bites` route, served by `WeeklyBitesContainer` in `libs/bite-tribe/home/page`

## Related Domains

- [[User]]
- [[Bite]]

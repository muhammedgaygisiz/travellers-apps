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

## Supported Evidence

- `notifyFollowersOnNewBite`
- `notifyBiteCreatorOnLike`
- `notifyBiteCreatorOnReview`
- `notifyUserOnNewFollower`
- `sendWeeklyBiteNotification`
- `sendDailyLeaderboardNotification`
- `handleSharedLinkToBite`
- `loadWeeklyBites`
- `weekly-bites` route, served by `WeeklyBitesContainer` in `libs/bite-tribe/home/page`

## Related Domains

- [[User]]
- [[Bite]]
